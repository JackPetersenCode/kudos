using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/public/reviews")]
    public class PublicFeedController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<PublicFeedController> _logger;

        public PublicFeedController(IConfiguration configuration, ILogger<PublicFeedController> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        // Recent reviews of nearby businesses, for the mobile home feed (Yelp-style).
        // Reviews are sparse pre-launch, so we sort newest-first and bound by a
        // generous radius; if lat/lng are omitted it returns the newest globally.
        [HttpGet("recent")]
        public async Task<IActionResult> Recent(
            [FromQuery] decimal? lat,
            [FromQuery] decimal? lng,
            [FromQuery] int radiusMiles = 60,
            [FromQuery] int limit = 20)
        {
            try
            {
                limit = Math.Clamp(limit, 1, 50);
                radiusMiles = Math.Clamp(radiusMiles, 1, 500);

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        r.id,
                        r.rating,
                        r.title,
                        r.body,
                        r.created_at_utc,
                        COALESCE(NULLIF(u.display_name, ''), split_part(u.email, '@', 1)) AS reviewer_name,
                        (SELECT original_url FROM review_photos rp
                            WHERE rp.review_id = r.id
                            ORDER BY created_at_utc ASC LIMIT 1) AS review_photo,
                        b.id AS business_id,
                        b.name AS business_name,
                        b.slug,
                        b.city,
                        b.state,
                        (SELECT COALESCE(AVG(rating), 0)::numeric(10,2) FROM reviews r2 WHERE r2.business_id = b.id) AS business_avg,
                        (SELECT COUNT(*)::int FROM reviews r3 WHERE r3.business_id = b.id) AS business_review_count,
                        (SELECT c.name FROM business_categories bc
                            JOIN categories c ON c.id = bc.category_id
                            WHERE bc.business_id = b.id
                            ORDER BY c.parent_slug NULLS LAST LIMIT 1) AS top_category,
                        CASE WHEN @user_lat::numeric IS NOT NULL AND @user_lng::numeric IS NOT NULL
                                  AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
                            THEN ROUND((3959 * acos(
                                LEAST(1.0, cos(radians(@user_lat)) * cos(radians(b.latitude))
                                * cos(radians(b.longitude) - radians(@user_lng))
                                + sin(radians(@user_lat)) * sin(radians(b.latitude)))
                            ))::numeric, 1)
                        ELSE NULL END AS distance_miles
                    FROM reviews r
                    INNER JOIN users u ON u.id = r.user_id
                    INNER JOIN businesses b ON b.id = r.business_id
                    WHERE
                        @user_lat::numeric IS NULL
                        OR @user_lng::numeric IS NULL
                        OR (
                            b.latitude IS NOT NULL AND b.longitude IS NOT NULL
                            AND b.latitude BETWEEN @user_lat - (@radius::numeric / 69.0)
                                               AND @user_lat + (@radius::numeric / 69.0)
                            AND b.longitude BETWEEN @user_lng - (@radius::numeric / (69.0 * cos(radians(@user_lat))))
                                                AND @user_lng + (@radius::numeric / (69.0 * cos(radians(@user_lat))))
                            AND (3959 * acos(
                                LEAST(1.0, cos(radians(@user_lat)) * cos(radians(b.latitude))
                                * cos(radians(b.longitude) - radians(@user_lng))
                                + sin(radians(@user_lat)) * sin(radians(b.latitude)))
                            )) <= @radius
                        )
                    ORDER BY r.created_at_utc DESC
                    LIMIT @limit;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.Add("@user_lat", NpgsqlDbType.Numeric).Value = (object?)lat ?? DBNull.Value;
                cmd.Parameters.Add("@user_lng", NpgsqlDbType.Numeric).Value = (object?)lng ?? DBNull.Value;
                cmd.Parameters.Add("@radius", NpgsqlDbType.Integer).Value = radiusMiles;
                cmd.Parameters.Add("@limit", NpgsqlDbType.Integer).Value = limit;

                var reviews = new List<object>();
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    reviews.Add(new
                    {
                        id = reader.GetGuid(0),
                        rating = reader.GetInt32(1),
                        title = reader.IsDBNull(2) ? null : reader.GetString(2),
                        body = reader.IsDBNull(3) ? null : reader.GetString(3),
                        createdAtUtc = reader.GetDateTime(4),
                        reviewerName = reader.IsDBNull(5) ? "Someone" : reader.GetString(5),
                        reviewPhotoUrl = reader.IsDBNull(6) ? null : reader.GetString(6),
                        businessId = reader.GetGuid(7),
                        businessName = reader.GetString(8),
                        slug = reader.GetString(9),
                        city = reader.IsDBNull(10) ? null : reader.GetString(10),
                        state = reader.IsDBNull(11) ? null : reader.GetString(11),
                        businessAverageRating = reader.GetDecimal(12),
                        businessReviewCount = reader.GetInt32(13),
                        topCategory = reader.IsDBNull(14) ? null : reader.GetString(14),
                        distanceMiles = reader.IsDBNull(15) ? (decimal?)null : reader.GetDecimal(15)
                    });
                }

                return Ok(new { reviews });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(Recent));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }
    }
}
