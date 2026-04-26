using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Stripe;
using System.Security.Claims;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/admin/ads")]
    [Authorize]
    public class AdminAdsController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public AdminAdsController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GetAdsForReview([FromQuery] string? status)
        {
            try
            {
                if (!IsAdmin())
                {
                    return Forbid();
                }

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        a.id,
                        a.business_id,
                        b.name,
                        b.slug,
                        a.title,
                        a.headline,
                        a.description,
                        a.image_url,
                        a.destination_url,
                        a.status,
                        a.created_at_utc,
                        a.updated_at_utc
                    FROM ads a
                    INNER JOIN businesses b
                        ON b.id = a.business_id
                    WHERE (@status::text IS NULL OR a.status = @status)
                    ORDER BY a.created_at_utc DESC;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@status", (object?)status ?? DBNull.Value);

                await using var reader = await cmd.ExecuteReaderAsync();
                var ads = new List<object>();

                while (await reader.ReadAsync())
                {
                    ads.Add(new
                    {
                        id = reader.GetGuid(0),
                        businessId = reader.GetGuid(1),
                        businessName = reader.GetString(2),
                        businessSlug = reader.GetString(3),
                        title = reader.GetString(4),
                        headline = reader.IsDBNull(5) ? null : reader.GetString(5),
                        description = reader.IsDBNull(6) ? null : reader.GetString(6),
                        imageUrl = reader.IsDBNull(7) ? null : reader.GetString(7),
                        destinationUrl = reader.GetString(8),
                        status = reader.GetString(9),
                        createdAtUtc = reader.GetDateTime(10),
                        updatedAtUtc = reader.GetDateTime(11)
                    });
                }

                return Ok(ads);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{adId:guid}")]
        public async Task<IActionResult> GetAd(Guid adId)
        {
            try
            {
                if (!IsAdmin())
                {
                    return Forbid();
                }

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        a.id,
                        a.business_id,
                        b.name,
                        b.slug,
                        a.title,
                        a.headline,
                        a.description,
                        a.image_url,
                        a.destination_url,
                        a.status,
                        a.created_at_utc,
                        a.updated_at_utc
                    FROM ads a
                    INNER JOIN businesses b
                        ON b.id = a.business_id
                    WHERE a.id = @ad_id
                    LIMIT 1;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@ad_id", adId);

                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                {
                    return NotFound("Ad not found.");
                }

                return Ok(new
                {
                    id = reader.GetGuid(0),
                    businessId = reader.GetGuid(1),
                    businessName = reader.GetString(2),
                    businessSlug = reader.GetString(3),
                    title = reader.GetString(4),
                    headline = reader.IsDBNull(5) ? null : reader.GetString(5),
                    description = reader.IsDBNull(6) ? null : reader.GetString(6),
                    imageUrl = reader.IsDBNull(7) ? null : reader.GetString(7),
                    destinationUrl = reader.GetString(8),
                    status = reader.GetString(9),
                    createdAtUtc = reader.GetDateTime(10),
                    updatedAtUtc = reader.GetDateTime(11)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("{adId:guid}/approve")]
        public async Task<IActionResult> ApproveAd(Guid adId)
        {
            return await UpdateAdStatus(adId, "active");
        }

        [HttpPost("{adId:guid}/reject")]
        public async Task<IActionResult> RejectAd(Guid adId)
        {
            return await UpdateAdStatus(adId, "rejected");
        }

        [HttpPost("{adId:guid}/pause")]
        public async Task<IActionResult> PauseAd(Guid adId)
        {
            return await UpdateAdStatus(adId, "paused");
        }

        private async Task<IActionResult> UpdateAdStatus(Guid adId, string newStatus)
        {
            try
            {
                if (!IsAdmin())
                {
                    return Forbid();
                }

                var stripeKey = _configuration["Stripe:SecretKey"];

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                // Get payment intent IDs for this ad's campaigns
                if (newStatus == "active" || newStatus == "rejected")
                {
                    var piSql = """
                        SELECT stripe_payment_intent_id
                        FROM ad_campaigns
                        WHERE ad_id = @ad_id
                          AND stripe_payment_intent_id IS NOT NULL;
                        """;

                    var paymentIntentIds = new List<string>();

                    await using (var piCmd = new NpgsqlCommand(piSql, connection))
                    {
                        piCmd.Parameters.AddWithValue("@ad_id", adId);
                        await using var piReader = await piCmd.ExecuteReaderAsync();
                        while (await piReader.ReadAsync())
                        {
                            paymentIntentIds.Add(piReader.GetString(0));
                        }
                    }

                    if (paymentIntentIds.Count > 0 && !string.IsNullOrWhiteSpace(stripeKey))
                    {
                        StripeConfiguration.ApiKey = stripeKey;
                        var piService = new PaymentIntentService();

                        foreach (var piId in paymentIntentIds)
                        {
                            try
                            {
                                if (newStatus == "active")
                                {
                                    // Capture the held payment
                                    await piService.CaptureAsync(piId);
                                }
                                else if (newStatus == "rejected")
                                {
                                    // Cancel the hold — user is never charged
                                    await piService.CancelAsync(piId);
                                }
                            }
                            catch (StripeException ex)
                            {
                                // Don't block status update if Stripe fails
                            }
                        }
                    }
                }

                var sql = """
                    UPDATE ads
                    SET
                        status = @status,
                        updated_at_utc = @updated_at_utc
                    WHERE id = @ad_id;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@status", newStatus);
                cmd.Parameters.AddWithValue("@updated_at_utc", DateTime.UtcNow);
                cmd.Parameters.AddWithValue("@ad_id", adId);

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0)
                {
                    return NotFound("Ad not found.");
                }

                return Ok(new { id = adId, status = newStatus, success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private bool IsAdmin()
        {
            var role =
                User.FindFirst(ClaimTypes.Role)?.Value ??
                User.FindFirst("role")?.Value;

            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);
        }

        private string GetConnectionString()
        {
            var cs = _configuration.GetConnectionString("WebApiDatabase");
            if (string.IsNullOrWhiteSpace(cs))
            {
                throw new InvalidOperationException("Missing connection string: WebApiDatabase");
            }

            return cs;
        }
    }
}