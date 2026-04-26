using Kudos.Server.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Security.Claims;

namespace Kudos.Server.Controllers
{
    /// <summary>
    /// Handles: Business Responses, Bookmarks, Helpful Votes, Check-Ins,
    /// Business Claims, Seasonal Tags, Badges, Analytics, Feed
    /// </summary>
    [ApiController]
    public class FeaturesController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public FeaturesController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        private string GetConnectionString() =>
            _configuration.GetConnectionString("WebApiDatabase")
            ?? throw new InvalidOperationException("Missing connection string: WebApiDatabase");

        private string? GetEmail() =>
            User.FindFirst(ClaimTypes.Email)?.Value ??
            User.FindFirst(ClaimTypes.Name)?.Value ??
            User.Identity?.Name;

        private async Task<Guid?> GetUserIdAsync(NpgsqlConnection connection, string email)
        {
            var sql = "SELECT id FROM users WHERE email = @email LIMIT 1;";
            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@email", email);
            var result = await cmd.ExecuteScalarAsync();
            return result == null ? null : (Guid)result;
        }

        // ==========================================
        // BUSINESS RESPONSES TO REVIEWS
        // ==========================================

        [HttpPost("api/business/{businessId:guid}/reviews/{reviewId:guid}/response")]
        [Authorize]
        public async Task<IActionResult> CreateReviewResponse(Guid businessId, Guid reviewId, [FromBody] CreateBusinessResponseRequest request)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                // Verify business membership
                var accessSql = """
                    SELECT bm.membership_role
                    FROM business_memberships bm
                    WHERE bm.user_id = @user_id AND bm.business_id = @business_id
                    LIMIT 1;
                    """;

                await using (var accessCmd = new NpgsqlCommand(accessSql, connection))
                {
                    accessCmd.Parameters.AddWithValue("@user_id", userId.Value);
                    accessCmd.Parameters.AddWithValue("@business_id", businessId);
                    var role = await accessCmd.ExecuteScalarAsync();
                    if (role == null) return Forbid();
                }

                var responseId = Guid.NewGuid();
                var insertSql = """
                    INSERT INTO review_responses (id, review_id, business_id, user_id, body, created_at_utc)
                    VALUES (@id, @review_id, @business_id, @user_id, @body, @created_at_utc);
                    """;

                await using var cmd = new NpgsqlCommand(insertSql, connection);
                cmd.Parameters.AddWithValue("@id", responseId);
                cmd.Parameters.AddWithValue("@review_id", reviewId);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);
                cmd.Parameters.AddWithValue("@body", request.Body);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { responseId, reviewId, body = request.Body });
            }
            catch (PostgresException ex) when (ex.SqlState == "23505")
            {
                return BadRequest("A response already exists for this review.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==========================================
        // BOOKMARKS / FAVORITES
        // ==========================================

        [HttpPost("api/favorites/{businessId:guid}")]
        [Authorize]
        public async Task<IActionResult> AddFavorite(Guid businessId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = """
                    INSERT INTO user_favorites (id, user_id, business_id, created_at_utc)
                    VALUES (@id, @user_id, @business_id, @created_at_utc)
                    ON CONFLICT (user_id, business_id) DO NOTHING;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                cmd.Parameters.AddWithValue("@user_id", userId.Value);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { businessId, favorited = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("api/favorites/{businessId:guid}")]
        [Authorize]
        public async Task<IActionResult> RemoveFavorite(Guid businessId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = "DELETE FROM user_favorites WHERE user_id = @user_id AND business_id = @business_id;";

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);
                cmd.Parameters.AddWithValue("@business_id", businessId);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { businessId, favorited = false });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("api/favorites")]
        [Authorize]
        public async Task<IActionResult> GetFavorites()
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = """
                    SELECT
                        b.id,
                        b.name,
                        b.slug,
                        b.city,
                        b.state,
                        b.description,
                        uf.created_at_utc AS favorited_at,
                        (SELECT original_url FROM business_photos bp WHERE bp.business_id = b.id AND bp.is_primary = TRUE LIMIT 1) AS primary_photo_url,
                        COALESCE(AVG(r.rating), 0)::numeric(10,2) AS average_rating,
                        COUNT(r.id)::int AS review_count
                    FROM user_favorites uf
                    INNER JOIN businesses b ON b.id = uf.business_id
                    LEFT JOIN reviews r ON r.business_id = b.id
                    WHERE uf.user_id = @user_id
                    GROUP BY b.id, b.name, b.slug, b.city, b.state, b.description, uf.created_at_utc
                    ORDER BY uf.created_at_utc DESC;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);

                await using var reader = await cmd.ExecuteReaderAsync();
                var favorites = new List<object>();

                while (await reader.ReadAsync())
                {
                    favorites.Add(new
                    {
                        id = reader.GetGuid(0),
                        name = reader.GetString(1),
                        slug = reader.GetString(2),
                        city = reader.IsDBNull(3) ? null : reader.GetString(3),
                        state = reader.IsDBNull(4) ? null : reader.GetString(4),
                        description = reader.IsDBNull(5) ? null : reader.GetString(5),
                        favoritedAt = reader.GetDateTime(6),
                        primaryPhotoUrl = reader.IsDBNull(7) ? null : reader.GetString(7),
                        averageRating = reader.GetDecimal(8),
                        reviewCount = reader.GetInt32(9)
                    });
                }

                return Ok(favorites);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("api/favorites/{businessId:guid}/status")]
        [Authorize]
        public async Task<IActionResult> GetFavoriteStatus(Guid businessId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = "SELECT COUNT(*) FROM user_favorites WHERE user_id = @user_id AND business_id = @business_id;";

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);
                cmd.Parameters.AddWithValue("@business_id", businessId);

                var count = (long)(await cmd.ExecuteScalarAsync() ?? 0L);

                return Ok(new { isFavorited = count > 0 });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==========================================
        // HELPFUL VOTES ON REVIEWS
        // ==========================================

        [HttpPost("api/reviews/{reviewId:guid}/helpful")]
        [Authorize]
        public async Task<IActionResult> MarkReviewHelpful(Guid reviewId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = """
                    INSERT INTO review_helpful_votes (id, review_id, user_id, created_at_utc)
                    VALUES (@id, @review_id, @user_id, @created_at_utc)
                    ON CONFLICT (review_id, user_id) DO NOTHING;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                cmd.Parameters.AddWithValue("@review_id", reviewId);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { reviewId, helpful = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("api/reviews/{reviewId:guid}/helpful")]
        [Authorize]
        public async Task<IActionResult> UnmarkReviewHelpful(Guid reviewId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = "DELETE FROM review_helpful_votes WHERE review_id = @review_id AND user_id = @user_id;";

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@review_id", reviewId);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { reviewId, helpful = false });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==========================================
        // BUSINESS CLAIMS
        // ==========================================

        [HttpPost("api/public/business/{businessId:guid}/claim")]
        [Authorize]
        public async Task<IActionResult> ClaimBusiness(Guid businessId, [FromBody] CreateBusinessClaimRequest request)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                // Check if already a member
                var memberSql = """
                    SELECT COUNT(*) FROM business_memberships WHERE user_id = @user_id AND business_id = @business_id;
                    """;
                await using (var memberCmd = new NpgsqlCommand(memberSql, connection))
                {
                    memberCmd.Parameters.AddWithValue("@user_id", userId.Value);
                    memberCmd.Parameters.AddWithValue("@business_id", businessId);
                    var count = (long)(await memberCmd.ExecuteScalarAsync() ?? 0L);
                    if (count > 0)
                        return BadRequest("You already have access to this business.");
                }

                // Check for pending claim
                var pendingSql = """
                    SELECT COUNT(*) FROM business_claims WHERE user_id = @user_id AND business_id = @business_id AND status = 'pending';
                    """;
                await using (var pendingCmd = new NpgsqlCommand(pendingSql, connection))
                {
                    pendingCmd.Parameters.AddWithValue("@user_id", userId.Value);
                    pendingCmd.Parameters.AddWithValue("@business_id", businessId);
                    var count = (long)(await pendingCmd.ExecuteScalarAsync() ?? 0L);
                    if (count > 0)
                        return BadRequest("You already have a pending claim for this business.");
                }

                var claimId = Guid.NewGuid();
                var insertSql = """
                    INSERT INTO business_claims (id, business_id, user_id, status, verification_note, created_at_utc)
                    VALUES (@id, @business_id, @user_id, 'pending', @verification_note, @created_at_utc);
                    """;

                await using var cmd = new NpgsqlCommand(insertSql, connection);
                cmd.Parameters.AddWithValue("@id", claimId);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);
                cmd.Parameters.AddWithValue("@verification_note", (object?)request.VerificationNote ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { claimId, status = "pending" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("api/admin/claims")]
        [Authorize]
        public async Task<IActionResult> GetPendingClaims()
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                // Verify admin
                var adminSql = "SELECT role FROM users WHERE email = @email LIMIT 1;";
                await using (var adminCmd = new NpgsqlCommand(adminSql, connection))
                {
                    adminCmd.Parameters.AddWithValue("@email", email);
                    var role = await adminCmd.ExecuteScalarAsync();
                    if (role?.ToString() != "admin")
                        return Forbid();
                }

                var sql = """
                    SELECT
                        bc.id,
                        bc.business_id,
                        b.name AS business_name,
                        b.slug AS business_slug,
                        bc.user_id,
                        u.email AS user_email,
                        bc.status,
                        bc.verification_note,
                        bc.created_at_utc
                    FROM business_claims bc
                    INNER JOIN businesses b ON b.id = bc.business_id
                    INNER JOIN users u ON u.id = bc.user_id
                    ORDER BY
                        CASE bc.status WHEN 'pending' THEN 0 ELSE 1 END,
                        bc.created_at_utc DESC;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                await using var reader = await cmd.ExecuteReaderAsync();

                var claims = new List<object>();
                while (await reader.ReadAsync())
                {
                    claims.Add(new
                    {
                        id = reader.GetGuid(0),
                        businessId = reader.GetGuid(1),
                        businessName = reader.GetString(2),
                        businessSlug = reader.GetString(3),
                        userId = reader.GetGuid(4),
                        userEmail = reader.GetString(5),
                        status = reader.GetString(6),
                        verificationNote = reader.IsDBNull(7) ? null : reader.GetString(7),
                        createdAtUtc = reader.GetDateTime(8)
                    });
                }

                return Ok(claims);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("api/admin/claims/{claimId:guid}/approve")]
        [Authorize]
        public async Task<IActionResult> ApproveClaim(Guid claimId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var adminSql = "SELECT role FROM users WHERE email = @email LIMIT 1;";
                await using (var adminCmd = new NpgsqlCommand(adminSql, connection))
                {
                    adminCmd.Parameters.AddWithValue("@email", email);
                    var role = await adminCmd.ExecuteScalarAsync();
                    if (role?.ToString() != "admin")
                        return Forbid();
                }

                // Get claim details
                var getClaimSql = "SELECT business_id, user_id FROM business_claims WHERE id = @id AND status = 'pending' LIMIT 1;";
                Guid claimBusinessId, claimUserId;

                await using (var getCmd = new NpgsqlCommand(getClaimSql, connection))
                {
                    getCmd.Parameters.AddWithValue("@id", claimId);
                    await using var reader = await getCmd.ExecuteReaderAsync();
                    if (!await reader.ReadAsync())
                        return NotFound("Claim not found or already resolved.");
                    claimBusinessId = reader.GetGuid(0);
                    claimUserId = reader.GetGuid(1);
                }

                // Update claim status
                var updateSql = "UPDATE business_claims SET status = 'approved', resolved_at_utc = @now WHERE id = @id;";
                await using (var updateCmd = new NpgsqlCommand(updateSql, connection))
                {
                    updateCmd.Parameters.AddWithValue("@id", claimId);
                    updateCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                    await updateCmd.ExecuteNonQueryAsync();
                }

                // Create membership
                var memberSql = """
                    INSERT INTO business_memberships (id, business_id, user_id, membership_role, created_at_utc)
                    VALUES (@id, @business_id, @user_id, 'owner', @created_at_utc)
                    ON CONFLICT DO NOTHING;
                    """;
                await using (var memberCmd = new NpgsqlCommand(memberSql, connection))
                {
                    memberCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    memberCmd.Parameters.AddWithValue("@business_id", claimBusinessId);
                    memberCmd.Parameters.AddWithValue("@user_id", claimUserId);
                    memberCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);
                    await memberCmd.ExecuteNonQueryAsync();
                }

                // Notify user that claim was approved
                try
                {
                    var bizSlugSql = "SELECT slug, name FROM businesses WHERE id = @id LIMIT 1;";
                    await using var bizCmd = new NpgsqlCommand(bizSlugSql, connection);
                    bizCmd.Parameters.AddWithValue("@id", claimBusinessId);
                    await using var bizReader = await bizCmd.ExecuteReaderAsync();
                    if (await bizReader.ReadAsync())
                    {
                        var bizSlug = bizReader.GetString(0);
                        var bizName = bizReader.GetString(1);
                        await bizReader.CloseAsync();

                        var notifSql = """
                            INSERT INTO notifications (id, user_id, notification_type, subject, body, created_at_utc)
                            VALUES (@id, @user_id, 'claim_approved',
                                    'Your business claim was approved!',
                                    'You now own "' || @biz_name || '". Set up your business page to get started.',
                                    @now);
                            """;
                        await using var notifCmd = new NpgsqlCommand(notifSql, connection);
                        notifCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                        notifCmd.Parameters.AddWithValue("@user_id", claimUserId);
                        notifCmd.Parameters.AddWithValue("@biz_name", bizName);
                        notifCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                        await notifCmd.ExecuteNonQueryAsync();
                    }
                }
                catch { /* don't fail if notification fails */ }

                return Ok(new { claimId, status = "approved" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("api/admin/claims/{claimId:guid}/reject")]
        [Authorize]
        public async Task<IActionResult> RejectClaim(Guid claimId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var adminSql = "SELECT role FROM users WHERE email = @email LIMIT 1;";
                await using (var adminCmd = new NpgsqlCommand(adminSql, connection))
                {
                    adminCmd.Parameters.AddWithValue("@email", email);
                    var role = await adminCmd.ExecuteScalarAsync();
                    if (role?.ToString() != "admin")
                        return Forbid();
                }

                var updateSql = "UPDATE business_claims SET status = 'rejected', resolved_at_utc = @now WHERE id = @id AND status = 'pending';";
                await using var cmd = new NpgsqlCommand(updateSql, connection);
                cmd.Parameters.AddWithValue("@id", claimId);
                cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0)
                    return NotFound("Claim not found or already resolved.");

                return Ok(new { claimId, status = "rejected" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==========================================
        // CHECK-INS
        // ==========================================

        [HttpPost("api/public/business/{businessId:guid}/checkin")]
        [Authorize]
        public async Task<IActionResult> CheckIn(Guid businessId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var checkinId = Guid.NewGuid();
                var sql = """
                    INSERT INTO check_ins (id, user_id, business_id, created_at_utc)
                    VALUES (@id, @user_id, @business_id, @created_at_utc);
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@id", checkinId);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                // Award badges
                await CheckAndAwardBadgesAsync(connection, userId.Value);

                return Ok(new { checkinId, businessId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("api/public/business/{businessId:guid}/checkins")]
        public async Task<IActionResult> GetCheckInCount(Guid businessId)
        {
            try
            {
                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var sql = """
                    SELECT COUNT(*)::int AS total_checkins,
                           COUNT(DISTINCT user_id)::int AS unique_users
                    FROM check_ins
                    WHERE business_id = @business_id;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@business_id", businessId);

                await using var reader = await cmd.ExecuteReaderAsync();
                await reader.ReadAsync();

                return Ok(new
                {
                    totalCheckIns = reader.GetInt32(0),
                    uniqueUsers = reader.GetInt32(1)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==========================================
        // SEASONAL / EVENT TAGS
        // ==========================================

        [HttpGet("api/public/business/{businessId:guid}/seasonal-tags")]
        public async Task<IActionResult> GetSeasonalTags(Guid businessId)
        {
            try
            {
                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var sql = """
                    SELECT id, tag_name, expires_at_utc, created_at_utc
                    FROM business_seasonal_tags
                    WHERE business_id = @business_id
                      AND (expires_at_utc IS NULL OR expires_at_utc > now())
                    ORDER BY created_at_utc DESC;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@business_id", businessId);

                await using var reader = await cmd.ExecuteReaderAsync();
                var tags = new List<object>();

                while (await reader.ReadAsync())
                {
                    tags.Add(new
                    {
                        id = reader.GetGuid(0),
                        tagName = reader.GetString(1),
                        expiresAtUtc = reader.IsDBNull(2) ? null : (DateTime?)reader.GetDateTime(2),
                        createdAtUtc = reader.GetDateTime(3)
                    });
                }

                return Ok(tags);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("api/business/{businessId:guid}/seasonal-tags")]
        [Authorize]
        public async Task<IActionResult> CreateSeasonalTag(Guid businessId, [FromBody] CreateSeasonalTagRequest request)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                // Verify membership
                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var accessSql = """
                    SELECT membership_role FROM business_memberships
                    WHERE user_id = @user_id AND business_id = @business_id LIMIT 1;
                    """;
                await using (var accessCmd = new NpgsqlCommand(accessSql, connection))
                {
                    accessCmd.Parameters.AddWithValue("@user_id", userId.Value);
                    accessCmd.Parameters.AddWithValue("@business_id", businessId);
                    var role = await accessCmd.ExecuteScalarAsync();
                    if (role == null) return Forbid();
                }

                var tagId = Guid.NewGuid();
                var insertSql = """
                    INSERT INTO business_seasonal_tags (id, business_id, tag_name, expires_at_utc, created_at_utc)
                    VALUES (@id, @business_id, @tag_name, @expires_at_utc, @created_at_utc);
                    """;

                await using var cmd = new NpgsqlCommand(insertSql, connection);
                cmd.Parameters.AddWithValue("@id", tagId);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@tag_name", request.TagName);
                cmd.Parameters.AddWithValue("@expires_at_utc", (object?)request.ExpiresAtUtc ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { id = tagId, tagName = request.TagName });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("api/business/{businessId:guid}/seasonal-tags/{tagId:guid}")]
        [Authorize]
        public async Task<IActionResult> DeleteSeasonalTag(Guid businessId, Guid tagId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var accessSql = """
                    SELECT membership_role FROM business_memberships
                    WHERE user_id = @user_id AND business_id = @business_id LIMIT 1;
                    """;
                await using (var accessCmd = new NpgsqlCommand(accessSql, connection))
                {
                    accessCmd.Parameters.AddWithValue("@user_id", userId.Value);
                    accessCmd.Parameters.AddWithValue("@business_id", businessId);
                    var role = await accessCmd.ExecuteScalarAsync();
                    if (role == null) return Forbid();
                }

                var sql = "DELETE FROM business_seasonal_tags WHERE id = @id AND business_id = @business_id;";
                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@id", tagId);
                cmd.Parameters.AddWithValue("@business_id", businessId);

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0)
                    return NotFound("Tag not found.");

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==========================================
        // USER BADGES / MILESTONES
        // ==========================================

        [HttpGet("api/profile/badges")]
        [Authorize]
        public async Task<IActionResult> GetMyBadges()
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = """
                    SELECT badge_key, badge_label, awarded_at_utc
                    FROM user_badges
                    WHERE user_id = @user_id
                    ORDER BY awarded_at_utc DESC;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);

                await using var reader = await cmd.ExecuteReaderAsync();
                var badges = new List<object>();

                while (await reader.ReadAsync())
                {
                    badges.Add(new
                    {
                        badgeKey = reader.GetString(0),
                        badgeLabel = reader.GetString(1),
                        awardedAtUtc = reader.GetDateTime(2)
                    });
                }

                return Ok(badges);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private async Task CheckAndAwardBadgesAsync(NpgsqlConnection connection, Guid userId)
        {
            // Review count badges
            var reviewCountSql = "SELECT COUNT(*)::int FROM reviews WHERE user_id = @user_id;";
            int reviewCount;
            await using (var cmd = new NpgsqlCommand(reviewCountSql, connection))
            {
                cmd.Parameters.AddWithValue("@user_id", userId);
                reviewCount = (int)(await cmd.ExecuteScalarAsync() ?? 0);
            }

            var badgesToAward = new List<(string key, string label)>();

            if (reviewCount >= 1) badgesToAward.Add(("first-review", "First Review"));
            if (reviewCount >= 5) badgesToAward.Add(("five-reviews", "5 Reviews"));
            if (reviewCount >= 10) badgesToAward.Add(("ten-reviews", "10 Reviews"));
            if (reviewCount >= 25) badgesToAward.Add(("twenty-five-reviews", "25 Reviews"));
            if (reviewCount >= 50) badgesToAward.Add(("fifty-reviews", "Review Expert"));

            // Check-in count badges
            var checkinCountSql = "SELECT COUNT(*)::int FROM check_ins WHERE user_id = @user_id;";
            int checkinCount;
            await using (var cmd = new NpgsqlCommand(checkinCountSql, connection))
            {
                cmd.Parameters.AddWithValue("@user_id", userId);
                checkinCount = (int)(await cmd.ExecuteScalarAsync() ?? 0);
            }

            if (checkinCount >= 1) badgesToAward.Add(("first-checkin", "First Check-In"));
            if (checkinCount >= 10) badgesToAward.Add(("ten-checkins", "Regular"));
            if (checkinCount >= 50) badgesToAward.Add(("fifty-checkins", "Local Explorer"));

            foreach (var (key, label) in badgesToAward)
            {
                var insertBadgeSql = """
                    INSERT INTO user_badges (id, user_id, badge_key, badge_label, awarded_at_utc)
                    VALUES (@id, @user_id, @badge_key, @badge_label, @awarded_at_utc)
                    ON CONFLICT (user_id, badge_key) DO NOTHING;
                    """;

                await using var badgeCmd = new NpgsqlCommand(insertBadgeSql, connection);
                badgeCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                badgeCmd.Parameters.AddWithValue("@user_id", userId);
                badgeCmd.Parameters.AddWithValue("@badge_key", key);
                badgeCmd.Parameters.AddWithValue("@badge_label", label);
                badgeCmd.Parameters.AddWithValue("@awarded_at_utc", DateTime.UtcNow);

                await badgeCmd.ExecuteNonQueryAsync();
            }
        }

        // ==========================================
        // STAFF LEADERBOARD
        // ==========================================

        [HttpGet("api/public/staff/leaderboard")]
        public async Task<IActionResult> GetStaffLeaderboard(
            [FromQuery] string? city,
            [FromQuery] string? state,
            [FromQuery] string? category,
            [FromQuery] int limit = 20)
        {
            try
            {
                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        sm.id,
                        sm.first_name,
                        sm.last_name,
                        sm.role,
                        sm.photo_url,
                        b.name AS business_name,
                        b.slug AS business_slug,
                        b.city,
                        b.state,
                        COUNT(DISTINCT sk.id)::int AS kudos_count,
                        COALESCE(
                            (SELECT json_agg(json_build_object('tagName', sub.tag_name, 'count', sub.cnt))
                             FROM (
                                SELECT skt.tag_name, COUNT(*)::int AS cnt
                                FROM staff_kudos_tags skt
                                INNER JOIN staff_kudos sk2 ON sk2.id = skt.staff_kudos_id
                                WHERE sk2.staff_member_id = sm.id
                                GROUP BY skt.tag_name
                                ORDER BY cnt DESC
                                LIMIT 5
                             ) sub
                            ), '[]'::json
                        ) AS top_tags
                    FROM staff_members sm
                    INNER JOIN businesses b ON b.id = sm.business_id
                    LEFT JOIN staff_kudos sk ON sk.staff_member_id = sm.id
                    LEFT JOIN business_categories bc ON bc.business_id = b.id
                    LEFT JOIN categories c ON c.id = bc.category_id
                    WHERE sm.is_active = TRUE
                      AND (@city::text IS NULL OR LOWER(b.city) = LOWER(@city))
                      AND (@state::text IS NULL OR LOWER(b.state) = LOWER(@state))
                      AND (@category::text IS NULL OR c.slug = @category OR c.parent_slug = @category)
                    GROUP BY sm.id, sm.first_name, sm.last_name, sm.role, sm.photo_url,
                             b.name, b.slug, b.city, b.state
                    HAVING COUNT(sk.id) > 0
                    ORDER BY kudos_count DESC
                    LIMIT @limit;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@city", (object?)city ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@state", (object?)state ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@category", (object?)category ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@limit", Math.Clamp(limit, 1, 50));

                await using var reader = await cmd.ExecuteReaderAsync();
                var results = new List<object>();

                while (await reader.ReadAsync())
                {
                    results.Add(new
                    {
                        id = reader.GetGuid(0),
                        firstName = reader.GetString(1),
                        lastName = reader.GetString(2),
                        role = reader.IsDBNull(3) ? null : reader.GetString(3),
                        photoUrl = reader.IsDBNull(4) ? null : reader.GetString(4),
                        businessName = reader.GetString(5),
                        businessSlug = reader.GetString(6),
                        city = reader.IsDBNull(7) ? null : reader.GetString(7),
                        state = reader.IsDBNull(8) ? null : reader.GetString(8),
                        kudosCount = reader.GetInt32(9),
                        topTags = reader.GetString(10)
                    });
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==========================================
        // NOTIFICATIONS
        // ==========================================

        [HttpGet("api/profile/notifications")]
        [Authorize]
        public async Task<IActionResult> GetNotifications()
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = """
                    SELECT id, notification_type, subject, body, is_read, created_at_utc
                    FROM notifications
                    WHERE user_id = @user_id
                    ORDER BY created_at_utc DESC
                    LIMIT 50;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);

                await using var reader = await cmd.ExecuteReaderAsync();
                var notifications = new List<object>();

                while (await reader.ReadAsync())
                {
                    notifications.Add(new
                    {
                        id = reader.GetGuid(0),
                        notificationType = reader.GetString(1),
                        subject = reader.GetString(2),
                        body = reader.GetString(3),
                        isRead = reader.GetBoolean(4),
                        createdAtUtc = reader.GetDateTime(5)
                    });
                }

                return Ok(notifications);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("api/profile/notifications/unread-count")]
        [Authorize]
        public async Task<IActionResult> GetUnreadNotificationCount()
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = "SELECT COUNT(*)::int FROM notifications WHERE user_id = @user_id AND is_read = FALSE;";

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);

                var count = (int)(await cmd.ExecuteScalarAsync() ?? 0);

                return Ok(new { unreadCount = count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("api/profile/notifications/mark-read")]
        [Authorize]
        public async Task<IActionResult> MarkNotificationsRead()
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = "UPDATE notifications SET is_read = TRUE WHERE user_id = @user_id AND is_read = FALSE;";

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("api/profile/notification-preferences")]
        [Authorize]
        public async Task<IActionResult> GetNotificationPreferences()
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = """
                    SELECT email_on_new_review, email_on_review_response, email_on_new_kudos, email_on_favorite_activity
                    FROM notification_preferences
                    WHERE user_id = @user_id
                    LIMIT 1;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);

                await using var reader = await cmd.ExecuteReaderAsync();

                if (await reader.ReadAsync())
                {
                    return Ok(new
                    {
                        emailOnNewReview = reader.GetBoolean(0),
                        emailOnReviewResponse = reader.GetBoolean(1),
                        emailOnNewKudos = reader.GetBoolean(2),
                        emailOnFavoriteActivity = reader.GetBoolean(3)
                    });
                }

                // Return defaults if no preferences set
                return Ok(new
                {
                    emailOnNewReview = true,
                    emailOnReviewResponse = true,
                    emailOnNewKudos = true,
                    emailOnFavoriteActivity = false
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("api/profile/notification-preferences")]
        [Authorize]
        public async Task<IActionResult> UpdateNotificationPreferences([FromBody] NotificationPreferencesRequest request)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                var sql = """
                    INSERT INTO notification_preferences (id, user_id, email_on_new_review, email_on_review_response, email_on_new_kudos, email_on_favorite_activity, updated_at_utc)
                    VALUES (@id, @user_id, @email_on_new_review, @email_on_review_response, @email_on_new_kudos, @email_on_favorite_activity, @updated_at_utc)
                    ON CONFLICT (user_id) DO UPDATE SET
                        email_on_new_review = @email_on_new_review,
                        email_on_review_response = @email_on_review_response,
                        email_on_new_kudos = @email_on_new_kudos,
                        email_on_favorite_activity = @email_on_favorite_activity,
                        updated_at_utc = @updated_at_utc;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                cmd.Parameters.AddWithValue("@user_id", userId.Value);
                cmd.Parameters.AddWithValue("@email_on_new_review", request.EmailOnNewReview);
                cmd.Parameters.AddWithValue("@email_on_review_response", request.EmailOnReviewResponse);
                cmd.Parameters.AddWithValue("@email_on_new_kudos", request.EmailOnNewKudos);
                cmd.Parameters.AddWithValue("@email_on_favorite_activity", request.EmailOnFavoriteActivity);
                cmd.Parameters.AddWithValue("@updated_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==========================================
        // ACTIVITY FEED
        // ==========================================

        [HttpGet("api/feed")]
        [Authorize]
        public async Task<IActionResult> GetActivityFeed()
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                // Get reviews from favorited businesses + recent general activity
                var sql = """
                    SELECT
                        r.id,
                        r.rating,
                        r.title,
                        r.body,
                        r.created_at_utc,
                        b.name AS business_name,
                        b.slug AS business_slug,
                        u.email AS reviewer_email,
                        'review' AS event_type
                    FROM reviews r
                    INNER JOIN businesses b ON b.id = r.business_id
                    INNER JOIN users u ON u.id = r.user_id
                    WHERE r.business_id IN (
                        SELECT business_id FROM user_favorites WHERE user_id = @user_id
                    )
                    AND r.user_id != @user_id
                    ORDER BY r.created_at_utc DESC
                    LIMIT 50;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@user_id", userId.Value);

                await using var reader = await cmd.ExecuteReaderAsync();
                var feed = new List<object>();

                while (await reader.ReadAsync())
                {
                    feed.Add(new
                    {
                        id = reader.GetGuid(0),
                        rating = reader.GetInt16(1),
                        title = reader.IsDBNull(2) ? null : reader.GetString(2),
                        body = reader.IsDBNull(3) ? null : reader.GetString(3),
                        createdAtUtc = reader.GetDateTime(4),
                        businessName = reader.GetString(5),
                        businessSlug = reader.GetString(6),
                        reviewerEmail = reader.GetString(7),
                        eventType = reader.GetString(8)
                    });
                }

                return Ok(feed);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==========================================
        // BUSINESS ANALYTICS DASHBOARD
        // ==========================================

        [HttpGet("api/business/{businessId:guid}/analytics")]
        [Authorize]
        public async Task<IActionResult> GetBusinessAnalytics(Guid businessId)
        {
            try
            {
                var email = GetEmail();
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var userId = await GetUserIdAsync(connection, email);
                if (userId == null) return NotFound("User not found.");

                // Verify membership
                var accessSql = """
                    SELECT membership_role FROM business_memberships
                    WHERE user_id = @user_id AND business_id = @business_id LIMIT 1;
                    """;
                await using (var accessCmd = new NpgsqlCommand(accessSql, connection))
                {
                    accessCmd.Parameters.AddWithValue("@user_id", userId.Value);
                    accessCmd.Parameters.AddWithValue("@business_id", businessId);
                    var role = await accessCmd.ExecuteScalarAsync();
                    if (role == null) return Forbid();
                }

                // Review stats
                var reviewStatsSql = """
                    SELECT
                        COUNT(*)::int AS total_reviews,
                        COALESCE(AVG(rating), 0)::numeric(10,2) AS average_rating
                    FROM reviews WHERE business_id = @business_id;
                    """;

                int totalReviews;
                decimal avgRating;
                await using (var cmd = new NpgsqlCommand(reviewStatsSql, connection))
                {
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    await using var reader = await cmd.ExecuteReaderAsync();
                    await reader.ReadAsync();
                    totalReviews = reader.GetInt32(0);
                    avgRating = reader.GetDecimal(1);
                }

                // Reviews by month (last 12 months)
                var reviewsByMonthSql = """
                    SELECT
                        TO_CHAR(created_at_utc, 'YYYY-MM') AS month,
                        COUNT(*)::int AS count,
                        COALESCE(AVG(rating), 0)::numeric(10,2) AS avg_rating
                    FROM reviews
                    WHERE business_id = @business_id
                      AND created_at_utc >= now() - INTERVAL '12 months'
                    GROUP BY month
                    ORDER BY month ASC;
                    """;

                var reviewsByMonth = new List<object>();
                await using (var cmd = new NpgsqlCommand(reviewsByMonthSql, connection))
                {
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        reviewsByMonth.Add(new
                        {
                            month = reader.GetString(0),
                            count = reader.GetInt32(1),
                            averageRating = reader.GetDecimal(2)
                        });
                    }
                }

                // Tag breakdown
                var tagBreakdownSql = """
                    SELECT rpt.tag_name, COUNT(*)::int AS count
                    FROM review_positive_tags rpt
                    INNER JOIN reviews r ON r.id = rpt.review_id
                    WHERE r.business_id = @business_id
                    GROUP BY rpt.tag_name
                    ORDER BY count DESC;
                    """;

                var tagBreakdown = new List<object>();
                await using (var cmd = new NpgsqlCommand(tagBreakdownSql, connection))
                {
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        tagBreakdown.Add(new
                        {
                            tagName = reader.GetString(0),
                            count = reader.GetInt32(1)
                        });
                    }
                }

                // Check-in count
                var checkinSql = "SELECT COUNT(*)::int FROM check_ins WHERE business_id = @business_id;";
                int checkinCount;
                await using (var cmd = new NpgsqlCommand(checkinSql, connection))
                {
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    checkinCount = (int)(await cmd.ExecuteScalarAsync() ?? 0);
                }

                // Favorites count
                var favSql = "SELECT COUNT(*)::int FROM user_favorites WHERE business_id = @business_id;";
                int favCount;
                await using (var cmd = new NpgsqlCommand(favSql, connection))
                {
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    favCount = (int)(await cmd.ExecuteScalarAsync() ?? 0);
                }

                // Staff leaderboard
                var staffSql = """
                    SELECT
                        sm.id,
                        sm.first_name,
                        sm.last_name,
                        COUNT(sk.id)::int AS kudos_count
                    FROM staff_members sm
                    LEFT JOIN staff_kudos sk ON sk.staff_member_id = sm.id
                    WHERE sm.business_id = @business_id AND sm.is_active = TRUE
                    GROUP BY sm.id
                    ORDER BY kudos_count DESC
                    LIMIT 10;
                    """;

                var staffLeaderboard = new List<object>();
                await using (var cmd = new NpgsqlCommand(staffSql, connection))
                {
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        staffLeaderboard.Add(new
                        {
                            id = reader.GetGuid(0),
                            firstName = reader.GetString(1),
                            lastName = reader.GetString(2),
                            kudosCount = reader.GetInt32(3)
                        });
                    }
                }

                return Ok(new
                {
                    totalReviews,
                    averageRating = avgRating,
                    totalCheckIns = checkinCount,
                    totalFavorites = favCount,
                    reviewsByMonth,
                    tagBreakdown,
                    staffLeaderboard
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
