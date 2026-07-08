using Kudos.Server.Data;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/public/ads")]
    public class PublicAdsController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<PublicAdsController> _logger;

        public PublicAdsController(IConfiguration configuration, ILogger<PublicAdsController> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Auction-based ad selection: picks the highest bidder that still has budget remaining.
        /// - CPC: bid_cents is cost per click. Spend = clicks * bid_cents.
        /// - CPM: bid_cents is cost per 1000 impressions. Spend = impressions * bid_cents / 1000.
        /// - Flat: entire budget_cents is the cost, no per-event billing. Always serves until end date.
        /// </summary>
        [HttpGet("placement/{placementSlug}")]
        public async Task<IActionResult> GetAdForPlacement(
            string placementSlug,
            [FromQuery] string? category,
            [FromQuery] string? city,
            [FromQuery] string? state)
        {
            try
            {
                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                // Auction query: find all eligible campaigns, calculate spend, filter to those with remaining budget,
                // then pick the highest bidder. For flat pricing, effective_bid is budget_cents (always wins over small bids).
                var sql = """
                    WITH campaign_spend AS (
                        SELECT
                            ac.id AS campaign_id,
                            ac.ad_id,
                            ac.budget_cents,
                            ac.pricing_model,
                            ac.bid_cents,
                            CASE ac.pricing_model
                                WHEN 'cpc' THEN COALESCE(
                                    (SELECT COUNT(*)::bigint * ac.bid_cents FROM ad_clicks WHERE ad_id = ac.ad_id), 0
                                )
                                WHEN 'cpm' THEN COALESCE(
                                    (SELECT COUNT(*)::bigint * ac.bid_cents / 1000 FROM ad_impressions WHERE ad_id = ac.ad_id), 0
                                )
                                ELSE 0
                            END AS spent_cents,
                            CASE ac.pricing_model
                                WHEN 'flat' THEN ac.budget_cents
                                WHEN 'cpc' THEN COALESCE(ac.bid_cents, 1)
                                WHEN 'cpm' THEN COALESCE(ac.bid_cents, 1)
                                ELSE 1
                            END AS effective_bid
                        FROM ad_campaigns ac
                        INNER JOIN ads a ON a.id = ac.ad_id
                        INNER JOIN campaign_placements cp ON cp.campaign_id = ac.id
                        INNER JOIN ad_placements ap ON ap.id = cp.placement_id
                        LEFT JOIN ad_targeting atg ON atg.campaign_id = ac.id
                        WHERE ap.slug = @placement_slug
                          AND a.status = 'active'
                          AND ac.is_active = TRUE
                          AND NOW() BETWEEN ac.start_at_utc AND ac.end_at_utc
                          AND (@category::text IS NULL OR atg.category_slug IS NULL OR atg.category_slug = @category)
                          AND (@city::text IS NULL OR atg.city IS NULL OR LOWER(atg.city) = LOWER(@city))
                          AND (@state::text IS NULL OR atg.state IS NULL OR LOWER(atg.state) = LOWER(@state))
                    )
                    SELECT
                        cs.campaign_id,
                        cs.ad_id,
                        a.title,
                        a.headline,
                        a.description,
                        a.image_url,
                        a.destination_url,
                        a.business_id,
                        b.name AS business_name,
                        b.slug AS business_slug
                    FROM campaign_spend cs
                    INNER JOIN ads a ON a.id = cs.ad_id
                    INNER JOIN businesses b ON b.id = a.business_id
                    WHERE (cs.pricing_model = 'flat' OR cs.spent_cents < cs.budget_cents)
                    ORDER BY cs.effective_bid DESC, RANDOM()
                    LIMIT 1;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@placement_slug", placementSlug);
                cmd.Parameters.AddWithValue("@category", (object?)category ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@city", (object?)city ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@state", (object?)state ?? DBNull.Value);

                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                {
                    return Ok(null);
                }

                return Ok(new
                {
                    id = reader.GetGuid(1),        // ad_id
                    businessId = reader.GetGuid(7),
                    businessName = reader.GetString(8),
                    businessSlug = reader.GetString(9),
                    title = reader.GetString(2),
                    headline = reader.IsDBNull(3) ? null : reader.GetString(3),
                    description = reader.IsDBNull(4) ? null : reader.GetString(4),
                    imageUrl = reader.IsDBNull(5) ? null : reader.GetString(5),
                    destinationUrl = reader.GetString(6),
                    campaignId = reader.GetGuid(0),
                    placementSlug,
                    sponsored = true
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(GetAdForPlacement));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("{adId:guid}/impression")]
        public async Task<IActionResult> TrackImpression(Guid adId, [FromBody] TrackAdEventRequest request)
        {
            try
            {
                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var sql = """
                    INSERT INTO ad_impressions (
                        id, ad_id, placement_slug, page_path,
                        viewed_at_utc, ip_address, user_agent
                    )
                    VALUES (
                        @id, @ad_id, @placement_slug, @page_path,
                        @viewed_at_utc, @ip_address, @user_agent
                    );
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                cmd.Parameters.AddWithValue("@ad_id", adId);
                cmd.Parameters.AddWithValue("@placement_slug", request.PlacementSlug);
                cmd.Parameters.AddWithValue("@page_path", (object?)request.PagePath ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@viewed_at_utc", DateTime.UtcNow);
                cmd.Parameters.AddWithValue("@ip_address", (object?)HttpContext.Connection.RemoteIpAddress?.ToString() ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@user_agent", (object?)Request.Headers.UserAgent.ToString() ?? DBNull.Value);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(TrackImpression));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("{adId:guid}/click")]
        public async Task<IActionResult> TrackClick(Guid adId, [FromBody] TrackAdEventRequest request)
        {
            try
            {
                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var sql = """
                    INSERT INTO ad_clicks (
                        id, ad_id, placement_slug, page_path,
                        clicked_at_utc, ip_address, user_agent
                    )
                    VALUES (
                        @id, @ad_id, @placement_slug, @page_path,
                        @clicked_at_utc, @ip_address, @user_agent
                    );
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                cmd.Parameters.AddWithValue("@ad_id", adId);
                cmd.Parameters.AddWithValue("@placement_slug", request.PlacementSlug);
                cmd.Parameters.AddWithValue("@page_path", (object?)request.PagePath ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@clicked_at_utc", DateTime.UtcNow);
                cmd.Parameters.AddWithValue("@ip_address", (object?)HttpContext.Connection.RemoteIpAddress?.ToString() ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@user_agent", (object?)Request.Headers.UserAgent.ToString() ?? DBNull.Value);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(TrackClick));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
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
