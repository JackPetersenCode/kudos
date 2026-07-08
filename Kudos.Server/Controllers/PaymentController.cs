using Kudos.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Stripe;
using System.Security.Claims;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/payment")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly OpenAIService _openAi;
        private readonly PushNotificationService _push;
        private readonly ILogger<PaymentController> _logger;

        public PaymentController(IConfiguration configuration, OpenAIService openAi, PushNotificationService push, ILogger<PaymentController> logger)
        {
            _configuration = configuration;
            _openAi = openAi;
            _push = push;
            _logger = logger;
        }

        /// <summary>
        /// Creates a Stripe PaymentIntent with capture_method=manual (authorize-only, no charge yet).
        /// Called after ad + campaign are created. Stores the payment intent ID on the campaign.
        /// </summary>
        [HttpPost("create-hold")]
        public async Task<IActionResult> CreatePaymentHold([FromBody] CreateHoldRequest request)
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value ??
                            User.FindFirst(ClaimTypes.Name)?.Value ??
                            User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized();

                var stripeKey = _configuration["Stripe:SecretKey"];
                if (string.IsNullOrWhiteSpace(stripeKey))
                    return StatusCode(500, new { message = "Stripe is not configured." });

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                // Verify user owns the campaign's ad
                var verifySql = """
                    SELECT ac.budget_cents, a.title, b.name
                    FROM ad_campaigns ac
                    INNER JOIN ads a ON a.id = ac.ad_id
                    INNER JOIN businesses b ON b.id = a.business_id
                    INNER JOIN business_memberships bm ON bm.business_id = b.id
                    INNER JOIN users u ON u.id = bm.user_id
                    WHERE ac.id = @campaign_id
                      AND u.email = @email
                    LIMIT 1;
                    """;

                int budgetCents;
                string adTitle, businessName;

                await using (var verifyCmd = new NpgsqlCommand(verifySql, connection))
                {
                    verifyCmd.Parameters.AddWithValue("@campaign_id", request.CampaignId);
                    verifyCmd.Parameters.AddWithValue("@email", email);

                    await using var reader = await verifyCmd.ExecuteReaderAsync();
                    if (!await reader.ReadAsync())
                        return NotFound("Campaign not found or access denied.");

                    budgetCents = reader.GetInt32(0);
                    adTitle = reader.GetString(1);
                    businessName = reader.GetString(2);
                }

                if (budgetCents <= 0)
                    return BadRequest("Campaign budget must be greater than zero.");

                // Create Stripe PaymentIntent with manual capture (authorize-only)
                StripeConfiguration.ApiKey = stripeKey;

                var options = new PaymentIntentCreateOptions
                {
                    Amount = budgetCents,
                    Currency = "usd",
                    CaptureMethod = "manual",
                    Description = $"Reputater Ad: {adTitle} for {businessName}",
                    Metadata = new Dictionary<string, string>
                    {
                        ["campaign_id"] = request.CampaignId.ToString(),
                        ["email"] = email
                    }
                };

                var service = new PaymentIntentService();
                // Idempotency key keyed on the campaign so a retried request
                // reuses the same PaymentIntent instead of creating a duplicate hold.
                var paymentIntent = await service.CreateAsync(options, new RequestOptions
                {
                    IdempotencyKey = $"create-hold_{request.CampaignId}"
                });

                // Store payment intent ID on campaign
                var updateSql = """
                    UPDATE ad_campaigns
                    SET stripe_payment_intent_id = @pi_id
                    WHERE id = @campaign_id;
                    """;

                await using (var updateCmd = new NpgsqlCommand(updateSql, connection))
                {
                    updateCmd.Parameters.AddWithValue("@pi_id", paymentIntent.Id);
                    updateCmd.Parameters.AddWithValue("@campaign_id", request.CampaignId);
                    await updateCmd.ExecuteNonQueryAsync();
                }

                return Ok(new
                {
                    clientSecret = paymentIntent.ClientSecret,
                    paymentIntentId = paymentIntent.Id,
                    amount = budgetCents
                });
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(CreatePaymentHold));
                return StatusCode(400, new { message = "Payment could not be processed." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(CreatePaymentHold));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        /// <summary>
        /// Called after card is authorized to update the ad status to pending_review.
        /// </summary>
        [HttpPost("confirm-hold")]
        public async Task<IActionResult> ConfirmHold([FromBody] ConfirmHoldRequest request)
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value ??
                            User.FindFirst(ClaimTypes.Name)?.Value ??
                            User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized();

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                // Get ad details for AI review
                var getAdSql = """
                    SELECT a.id, a.title, a.headline, a.description, a.image_url, a.destination_url,
                           ac.stripe_payment_intent_id
                    FROM ads a
                    INNER JOIN ad_campaigns ac ON ac.ad_id = a.id
                    INNER JOIN business_memberships bm ON bm.business_id = a.business_id
                    INNER JOIN users u ON u.id = bm.user_id
                    WHERE ac.id = @campaign_id AND u.email = @email
                    LIMIT 1;
                    """;

                Guid adId;
                string adTitle, destinationUrl;
                string? headline, description, imageUrl, paymentIntentId;

                await using (var getCmd = new NpgsqlCommand(getAdSql, connection))
                {
                    getCmd.Parameters.AddWithValue("@campaign_id", request.CampaignId);
                    getCmd.Parameters.AddWithValue("@email", email);

                    await using var reader = await getCmd.ExecuteReaderAsync();
                    if (!await reader.ReadAsync())
                        return NotFound("Campaign not found.");

                    adId = reader.GetGuid(0);
                    adTitle = reader.GetString(1);
                    headline = reader.IsDBNull(2) ? null : reader.GetString(2);
                    description = reader.IsDBNull(3) ? null : reader.GetString(3);
                    imageUrl = reader.IsDBNull(4) ? null : reader.GetString(4);
                    destinationUrl = reader.GetString(5);
                    paymentIntentId = reader.IsDBNull(6) ? null : reader.GetString(6);
                }

                // AI review
                var review = await _openAi.ReviewAd(adTitle, headline, description, imageUrl, destinationUrl);

                string newStatus;
                string stripeKey = _configuration["Stripe:SecretKey"] ?? "";

                if (review.Decision == "reject")
                {
                    newStatus = "rejected";

                    // Cancel the payment hold — user is never charged
                    if (!string.IsNullOrWhiteSpace(paymentIntentId) && !string.IsNullOrWhiteSpace(stripeKey))
                    {
                        try
                        {
                            StripeConfiguration.ApiKey = stripeKey;
                            var piService = new PaymentIntentService();
                            await piService.CancelAsync(paymentIntentId);
                        }
                        catch (StripeException ex)
                        {
                            // Non-fatal: the ad is still rejected and won't run. Log so the
                            // dangling authorization can be reconciled (it auto-expires in ~7 days).
                            _logger.LogError(ex, "Failed to cancel payment hold {PaymentIntentId} for rejected ad {AdId}", paymentIntentId, adId);
                        }
                    }
                }
                else
                {
                    // Capture the payment BEFORE marking the ad active. If capture fails
                    // we must NOT activate the ad (previously it went live unpaid).
                    if (string.IsNullOrWhiteSpace(paymentIntentId) || string.IsNullOrWhiteSpace(stripeKey))
                    {
                        _logger.LogError("Cannot capture payment for ad {AdId}: missing payment intent or Stripe key.", adId);
                        return StatusCode(StatusCodes.Status402PaymentRequired, new
                        {
                            message = "Payment could not be processed. Your ad was not activated. Please try again."
                        });
                    }

                    try
                    {
                        StripeConfiguration.ApiKey = stripeKey;
                        var piService = new PaymentIntentService();
                        await piService.CaptureAsync(paymentIntentId, null, new RequestOptions
                        {
                            IdempotencyKey = $"capture_{paymentIntentId}"
                        });
                        newStatus = "active";
                    }
                    catch (StripeException ex)
                    {
                        // Charge failed → leave the ad inactive and tell the user.
                        // The ad status is left unchanged (not "active"); no unpaid ad goes live.
                        _logger.LogError(ex, "Payment capture FAILED for ad {AdId}, intent {PaymentIntentId}. Ad not activated.", adId, paymentIntentId);
                        return StatusCode(StatusCodes.Status402PaymentRequired, new
                        {
                            message = "We couldn't complete the payment, so your ad was not activated. Please check your payment method and try again."
                        });
                    }
                }

                // Update ad status
                var updateSql = """
                    UPDATE ads
                    SET status = @status, updated_at_utc = @now
                    WHERE id = @ad_id;
                    """;

                await using (var updateCmd = new NpgsqlCommand(updateSql, connection))
                {
                    updateCmd.Parameters.AddWithValue("@status", newStatus);
                    updateCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                    updateCmd.Parameters.AddWithValue("@ad_id", adId);
                    await updateCmd.ExecuteNonQueryAsync();
                }

                // Notify the user
                try
                {
                    var userId = await GetUserIdByEmail(connection, email);
                    if (userId != null)
                    {
                        var notifSubject = newStatus == "active"
                            ? "Your ad has been approved!"
                            : "Your ad was not approved";
                        var notifBody = newStatus == "active"
                            ? $"Your ad \"{adTitle}\" has been approved and is now live."
                            : $"Your ad \"{adTitle}\" was rejected. Reason: {review.Reason}";

                        var notifSql = """
                            INSERT INTO notifications (id, user_id, notification_type, subject, body, created_at_utc)
                            VALUES (@id, @user_id, 'ad_review', @subject, @body, @now);
                            """;

                        await using var notifCmd = new NpgsqlCommand(notifSql, connection);
                        notifCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                        notifCmd.Parameters.AddWithValue("@user_id", userId.Value);
                        notifCmd.Parameters.AddWithValue("@subject", notifSubject);
                        notifCmd.Parameters.AddWithValue("@body", notifBody);
                        notifCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                        await notifCmd.ExecuteNonQueryAsync();

                        // Fire push to the ad owner (fire-and-forget; failure non-fatal)
                        _ = _push.SendToUserAsync(
                            userId.Value,
                            notifSubject,
                            notifBody,
                            new { type = "ad_review", status = newStatus });
                    }
                }
                catch
                {
                    // Don't fail if notification fails
                }

                return Ok(new
                {
                    success = true,
                    status = newStatus,
                    reviewDecision = review.Decision,
                    reviewReason = review.Reason
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(ConfirmHold));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        private static async Task<Guid?> GetUserIdByEmail(NpgsqlConnection connection, string email)
        {
            var sql = "SELECT id FROM users WHERE email = @email LIMIT 1;";
            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@email", email);
            var result = await cmd.ExecuteScalarAsync();
            return result == null ? null : (Guid)result;
        }
    }

    public class CreateHoldRequest
    {
        public Guid CampaignId { get; set; }
    }

    public class ConfirmHoldRequest
    {
        public Guid CampaignId { get; set; }
    }
}
