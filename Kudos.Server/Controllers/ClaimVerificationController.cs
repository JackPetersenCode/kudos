using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Security.Claims;
using Kudos.Server.Services;
using Twilio;
using Twilio.Rest.Api.V2010.Account;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/public/business/{businessId:guid}/claim")]
    [Authorize]
    public class ClaimVerificationController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly EmailService _emailService;
        private readonly ILogger<ClaimVerificationController> _logger;

        public ClaimVerificationController(IConfiguration configuration, EmailService emailService, ILogger<ClaimVerificationController> logger)
        {
            _configuration = configuration;
            _emailService = emailService;
            _logger = logger;
        }

        /// <summary>
        /// Step 1: Initiate a claim. Checks auto-approve conditions first,
        /// then determines available verification methods.
        /// </summary>
        [HttpPost("initiate")]
        public async Task<IActionResult> InitiateClaim(Guid businessId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var userId = await GetUserId(connection, email);
                if (userId == null) return NotFound("User not found.");

                // --- AUTO-REJECT CHECKS ---

                // Account age check: must be at least 1 day old
                var ageSql = "SELECT created_at_utc FROM users WHERE id = @user_id;";
                await using (var ageCmd = new NpgsqlCommand(ageSql, connection))
                {
                    ageCmd.Parameters.AddWithValue("@user_id", userId.Value);
                    var createdAt = (DateTime)(await ageCmd.ExecuteScalarAsync())!;
                    if ((DateTime.UtcNow - createdAt).TotalHours < 24)
                        return BadRequest(new { reason = "account_too_new", message = "Your account must be at least 24 hours old to claim a business." });
                }

                // Too many pending claims check
                var pendingSql = "SELECT COUNT(*)::int FROM business_claims WHERE user_id = @user_id AND status = 'pending';";
                await using (var pendingCmd = new NpgsqlCommand(pendingSql, connection))
                {
                    pendingCmd.Parameters.AddWithValue("@user_id", userId.Value);
                    var pendingCount = (int)(await pendingCmd.ExecuteScalarAsync() ?? 0);
                    if (pendingCount >= 3)
                        return BadRequest(new { reason = "too_many_claims", message = "You have too many pending claims. Please wait for existing claims to be reviewed." });
                }

                // Already a member check
                var memberSql = "SELECT COUNT(*) FROM business_memberships WHERE user_id = @user_id AND business_id = @business_id;";
                await using (var memberCmd = new NpgsqlCommand(memberSql, connection))
                {
                    memberCmd.Parameters.AddWithValue("@user_id", userId.Value);
                    memberCmd.Parameters.AddWithValue("@business_id", businessId);
                    var count = (long)(await memberCmd.ExecuteScalarAsync() ?? 0L);
                    if (count > 0)
                        return BadRequest(new { reason = "already_member", message = "You already have access to this business." });
                }

                // Existing pending claim check
                var existingClaimSql = "SELECT COUNT(*) FROM business_claims WHERE user_id = @user_id AND business_id = @business_id AND status = 'pending';";
                await using (var existingCmd = new NpgsqlCommand(existingClaimSql, connection))
                {
                    existingCmd.Parameters.AddWithValue("@user_id", userId.Value);
                    existingCmd.Parameters.AddWithValue("@business_id", businessId);
                    var count = (long)(await existingCmd.ExecuteScalarAsync() ?? 0L);
                    if (count > 0)
                        return BadRequest(new { reason = "claim_exists", message = "You already have a pending claim for this business." });
                }

                // --- Get business info ---
                var bizSql = "SELECT website_url, phone FROM businesses WHERE id = @id LIMIT 1;";
                string? bizWebsite = null, bizPhone = null;
                await using (var bizCmd = new NpgsqlCommand(bizSql, connection))
                {
                    bizCmd.Parameters.AddWithValue("@id", businessId);
                    await using var reader = await bizCmd.ExecuteReaderAsync();
                    if (await reader.ReadAsync())
                    {
                        bizWebsite = reader.IsDBNull(0) ? null : reader.GetString(0);
                        bizPhone = reader.IsDBNull(1) ? null : reader.GetString(1);
                    }
                }

                // --- AUTO-APPROVE: Existing business owner ---
                var ownsOtherSql = "SELECT COUNT(*) FROM business_memberships WHERE user_id = @user_id AND membership_role = 'owner';";
                await using (var ownsCmd = new NpgsqlCommand(ownsOtherSql, connection))
                {
                    ownsCmd.Parameters.AddWithValue("@user_id", userId.Value);
                    var ownsCount = (long)(await ownsCmd.ExecuteScalarAsync() ?? 0L);
                    if (ownsCount > 0)
                    {
                        // Trusted user — auto-approve
                        await CreateAndApproveClaim(connection, businessId, userId.Value, "existing_owner", null);
                        return Ok(new { status = "approved", method = "existing_owner", message = "Claim auto-approved. You already own another business on Reputater." });
                    }
                }

                // --- AUTO-APPROVE: Email domain match ---
                if (!string.IsNullOrWhiteSpace(bizWebsite))
                {
                    var bizDomain = ExtractDomain(bizWebsite);
                    var emailDomain = email.Split('@').LastOrDefault();

                    if (!string.IsNullOrWhiteSpace(bizDomain) && !string.IsNullOrWhiteSpace(emailDomain)
                        && string.Equals(bizDomain, emailDomain, StringComparison.OrdinalIgnoreCase))
                    {
                        await CreateAndApproveClaim(connection, businessId, userId.Value, "email_domain", null);
                        return Ok(new { status = "approved", method = "email_domain", message = "Claim auto-approved. Your email matches the business domain." });
                    }
                }

                // --- Determine available verification methods ---
                var methods = new List<string>();

                if (!string.IsNullOrWhiteSpace(bizWebsite))
                {
                    var domain = ExtractDomain(bizWebsite);
                    if (!string.IsNullOrWhiteSpace(domain))
                        methods.Add("email");
                }

                // SMS claim verification is off by default (Twilio A2P deferred; email
                // is the primary method). Re-enable everywhere — web and mobile — by
                // setting Claims:SmsEnabled=true once the A2P campaign is approved.
                var smsEnabled = _configuration.GetValue<bool>("Claims:SmsEnabled");
                var twilioSid = _configuration["Twilio:AccountSid"];
                if (smsEnabled && !string.IsNullOrWhiteSpace(bizPhone) && !string.IsNullOrWhiteSpace(twilioSid))
                    methods.Add("sms");

                methods.Add("manual"); // always available

                return Ok(new
                {
                    status = "verification_required",
                    availableMethods = methods,
                    businessWebsite = bizWebsite,
                    businessPhone = bizPhone != null ? MaskPhone(bizPhone) : null,
                    message = "Please choose a verification method to prove you own this business."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(InitiateClaim));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        /// <summary>
        /// Step 2a: Send verification email to an address at the business domain.
        /// User provides the email address they want to receive the code at.
        /// </summary>
        [HttpPost("send-email-code")]
        public async Task<IActionResult> SendEmailCode(Guid businessId, [FromBody] SendCodeRequest request)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var userId = await GetUserId(connection, email);
                if (userId == null) return NotFound("User not found.");

                // Get business website
                var bizSql = "SELECT website_url FROM businesses WHERE id = @id LIMIT 1;";
                string? bizWebsite;
                await using (var cmd = new NpgsqlCommand(bizSql, connection))
                {
                    cmd.Parameters.AddWithValue("@id", businessId);
                    bizWebsite = (await cmd.ExecuteScalarAsync()) as string;
                }

                if (string.IsNullOrWhiteSpace(bizWebsite))
                    return BadRequest("This business has no website on file.");

                var bizDomain = ExtractDomain(bizWebsite);
                var verifyEmailDomain = request.VerificationEmail?.Split('@').LastOrDefault();

                if (string.IsNullOrWhiteSpace(bizDomain) || string.IsNullOrWhiteSpace(verifyEmailDomain)
                    || !string.Equals(bizDomain, verifyEmailDomain, StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest($"Email must be at the domain: {bizDomain}");
                }

                var code = GenerateCode();

                // Create or update claim with code
                var claimId = Guid.NewGuid();
                var upsertSql = """
                    INSERT INTO business_claims (id, business_id, user_id, status, verification_method, verification_code, verification_code_expires_at, verification_email, created_at_utc)
                    VALUES (@id, @business_id, @user_id, 'pending', 'email', @code, @expires, @verify_email, @now)
                    ON CONFLICT ON CONSTRAINT business_claims_pkey DO NOTHING;
                    """;

                await using (var cmd = new NpgsqlCommand(upsertSql, connection))
                {
                    cmd.Parameters.AddWithValue("@id", claimId);
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    cmd.Parameters.AddWithValue("@user_id", userId.Value);
                    cmd.Parameters.AddWithValue("@code", code);
                    cmd.Parameters.AddWithValue("@expires", DateTime.UtcNow.AddMinutes(30));
                    cmd.Parameters.AddWithValue("@verify_email", request.VerificationEmail!);
                    cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                    await cmd.ExecuteNonQueryAsync();
                }

                // Actually deliver the code to the business-domain email.
                try
                {
                    await _emailService.SendClaimVerificationCode(request.VerificationEmail!, code);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send claim verification email to {Email} for business {BusinessId}", request.VerificationEmail, businessId);
                    return StatusCode(500, new { message = "Could not send the verification email. Please try again or choose another verification method." });
                }

                _logger.LogInformation("Claim verification code sent for business {BusinessId} to {Email}", businessId, request.VerificationEmail);

                return Ok(new { claimId, message = $"Verification code sent to {request.VerificationEmail}. Check your inbox." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(SendEmailCode));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        /// <summary>
        /// Step 2b: Send SMS verification code to the business phone number.
        /// </summary>
        [HttpPost("send-sms-code")]
        public async Task<IActionResult> SendSmsCode(Guid businessId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                if (!_configuration.GetValue<bool>("Claims:SmsEnabled"))
                    return BadRequest("SMS verification is currently unavailable. Please use email verification.");

                var twilioSid = _configuration["Twilio:AccountSid"];
                var twilioToken = _configuration["Twilio:AuthToken"];
                var twilioPhone = _configuration["Twilio:PhoneNumber"];

                if (string.IsNullOrWhiteSpace(twilioSid) || string.IsNullOrWhiteSpace(twilioToken) || string.IsNullOrWhiteSpace(twilioPhone))
                    return BadRequest("SMS verification is not configured.");

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var userId = await GetUserId(connection, email);
                if (userId == null) return NotFound("User not found.");

                // Get business phone
                var bizSql = "SELECT phone FROM businesses WHERE id = @id LIMIT 1;";
                string? bizPhone;
                await using (var cmd = new NpgsqlCommand(bizSql, connection))
                {
                    cmd.Parameters.AddWithValue("@id", businessId);
                    bizPhone = (await cmd.ExecuteScalarAsync()) as string;
                }

                if (string.IsNullOrWhiteSpace(bizPhone))
                    return BadRequest("This business has no phone number on file.");

                var code = GenerateCode();

                // Create claim
                var claimId = Guid.NewGuid();
                var insertSql = """
                    INSERT INTO business_claims (id, business_id, user_id, status, verification_method, verification_code, verification_code_expires_at, verification_phone, created_at_utc)
                    VALUES (@id, @business_id, @user_id, 'pending', 'sms', @code, @expires, @phone, @now);
                    """;

                await using (var cmd = new NpgsqlCommand(insertSql, connection))
                {
                    cmd.Parameters.AddWithValue("@id", claimId);
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    cmd.Parameters.AddWithValue("@user_id", userId.Value);
                    cmd.Parameters.AddWithValue("@code", code);
                    cmd.Parameters.AddWithValue("@expires", DateTime.UtcNow.AddMinutes(10));
                    cmd.Parameters.AddWithValue("@phone", bizPhone);
                    cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                    await cmd.ExecuteNonQueryAsync();
                }

                // Send SMS via Twilio
                try
                {
                    TwilioClient.Init(twilioSid, twilioToken);

                    var normalizedPhone = NormalizePhone(bizPhone);

                    await MessageResource.CreateAsync(
                        body: $"Your Reputater business verification code is: {code}",
                        from: new Twilio.Types.PhoneNumber(twilioPhone),
                        to: new Twilio.Types.PhoneNumber(normalizedPhone)
                    );
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { message = "Could not send SMS. Please try email verification instead." });
                }

                return Ok(new { claimId, message = $"Verification code sent to {MaskPhone(bizPhone)}." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(SendSmsCode));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        /// <summary>
        /// Step 2c: Submit for manual review (no verification code needed).
        /// </summary>
        [HttpPost("manual")]
        public async Task<IActionResult> SubmitManualClaim(Guid businessId, [FromBody] ManualClaimRequest request)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var userId = await GetUserId(connection, email);
                if (userId == null) return NotFound("User not found.");

                var claimId = Guid.NewGuid();
                var insertSql = """
                    INSERT INTO business_claims (id, business_id, user_id, status, verification_method, verification_note, created_at_utc)
                    VALUES (@id, @business_id, @user_id, 'pending', 'manual', @note, @now);
                    """;

                await using var cmd = new NpgsqlCommand(insertSql, connection);
                cmd.Parameters.AddWithValue("@id", claimId);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);
                cmd.Parameters.AddWithValue("@note", (object?)request.VerificationNote ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                await cmd.ExecuteNonQueryAsync();

                return Ok(new { claimId, status = "pending", message = "Your claim has been submitted for manual review. You'll be notified when it's resolved." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(SubmitManualClaim));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        /// <summary>
        /// Step 3: Verify the code (for email or SMS methods).
        /// </summary>
        [HttpPost("verify-code")]
        public async Task<IActionResult> VerifyCode(Guid businessId, [FromBody] VerifyCodeRequest request)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var userId = await GetUserId(connection, email);
                if (userId == null) return NotFound("User not found.");

                // Find pending claim with matching code
                var claimSql = """
                    SELECT id FROM business_claims
                    WHERE business_id = @business_id
                      AND user_id = @user_id
                      AND status = 'pending'
                      AND verification_code = @code
                      AND verification_code_expires_at > @now
                    LIMIT 1;
                    """;

                Guid? claimId;
                await using (var cmd = new NpgsqlCommand(claimSql, connection))
                {
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    cmd.Parameters.AddWithValue("@user_id", userId.Value);
                    cmd.Parameters.AddWithValue("@code", request.Code);
                    cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);

                    var result = await cmd.ExecuteScalarAsync();
                    claimId = result == null ? null : (Guid)result;
                }

                if (claimId == null)
                    return BadRequest("Invalid or expired verification code.");

                // Approve the claim
                await ApproveClaim(connection, claimId.Value, businessId, userId.Value);

                return Ok(new { status = "approved", message = "Business claimed successfully! You now have owner access." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(VerifyCode));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        // --- Helper methods ---

        private async Task CreateAndApproveClaim(NpgsqlConnection connection, Guid businessId, Guid userId, string method, string? note)
        {
            var claimId = Guid.NewGuid();
            var insertSql = """
                INSERT INTO business_claims (id, business_id, user_id, status, verification_method, verification_note, created_at_utc, resolved_at_utc)
                VALUES (@id, @business_id, @user_id, 'approved', @method, @note, @now, @now);
                """;

            await using (var cmd = new NpgsqlCommand(insertSql, connection))
            {
                cmd.Parameters.AddWithValue("@id", claimId);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@user_id", userId);
                cmd.Parameters.AddWithValue("@method", method);
                cmd.Parameters.AddWithValue("@note", (object?)note ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                await cmd.ExecuteNonQueryAsync();
            }

            await CreateMembership(connection, businessId, userId);
        }

        private async Task ApproveClaim(NpgsqlConnection connection, Guid claimId, Guid businessId, Guid userId)
        {
            var updateSql = "UPDATE business_claims SET status = 'approved', resolved_at_utc = @now WHERE id = @id;";
            await using (var cmd = new NpgsqlCommand(updateSql, connection))
            {
                cmd.Parameters.AddWithValue("@id", claimId);
                cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                await cmd.ExecuteNonQueryAsync();
            }

            await CreateMembership(connection, businessId, userId);
        }

        private static async Task CreateMembership(NpgsqlConnection connection, Guid businessId, Guid userId)
        {
            var sql = """
                INSERT INTO business_memberships (id, business_id, user_id, membership_role, created_at_utc)
                VALUES (@id, @business_id, @user_id, 'owner', @now)
                ON CONFLICT DO NOTHING;
                """;

            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
            cmd.Parameters.AddWithValue("@business_id", businessId);
            cmd.Parameters.AddWithValue("@user_id", userId);
            cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
            await cmd.ExecuteNonQueryAsync();
        }

        private string? GetEmail() =>
            User.FindFirst(ClaimTypes.Email)?.Value ??
            User.FindFirst(ClaimTypes.Name)?.Value ??
            User.Identity?.Name;

        private static async Task<Guid?> GetUserId(NpgsqlConnection connection, string email)
        {
            var sql = "SELECT id FROM users WHERE email = @email LIMIT 1;";
            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@email", email);
            var result = await cmd.ExecuteScalarAsync();
            return result == null ? null : (Guid)result;
        }

        private static string GenerateCode() =>
            System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString();

        private static string MaskPhone(string phone)
        {
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            if (digits.Length < 4) return "***";
            return $"***-***-{digits[^4..]}";
        }

        private static string NormalizePhone(string phone)
        {
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            if (digits.Length == 10) return $"+1{digits}";
            if (digits.Length == 11 && digits.StartsWith('1')) return $"+{digits}";
            return $"+{digits}";
        }

        private static string? ExtractDomain(string url)
        {
            try
            {
                if (!url.StartsWith("http")) url = "https://" + url;
                var uri = new Uri(url);
                var host = uri.Host.ToLowerInvariant();
                if (host.StartsWith("www.")) host = host[4..];
                return host;
            }
            catch
            {
                return null;
            }
        }
    }

    public class SendCodeRequest
    {
        public string? VerificationEmail { get; set; }
    }

    public class ManualClaimRequest
    {
        public string? VerificationNote { get; set; }
    }

    public class VerifyCodeRequest
    {
        public string Code { get; set; } = "";
    }
}
