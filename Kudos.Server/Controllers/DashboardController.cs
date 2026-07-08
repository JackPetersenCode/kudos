using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Security.Claims;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<DashboardController> _logger;

        public DashboardController(IConfiguration configuration, ILogger<DashboardController> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        [HttpGet("activity")]
        public async Task<IActionResult> GetActivity()
        {
            try
            {
                var email =
                    User.FindFirst(ClaimTypes.Email)?.Value ??
                    User.FindFirst(ClaimTypes.Name)?.Value ??
                    User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                {
                    return Unauthorized("Email claim not found in token.");
                }

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var recentReviewsSql = """
                    SELECT
                        r.id,
                        r.rating,
                        r.title,
                        r.body,
                        r.created_at_utc,
                        b.name,
                        b.slug
                    FROM users u
                    INNER JOIN reviews r
                        ON r.user_id = u.id
                    INNER JOIN businesses b
                        ON b.id = r.business_id
                    WHERE u.email = @email
                    ORDER BY r.created_at_utc DESC
                    LIMIT 10;
                    """;

                var recentReviews = new List<object>();
                var reviewIds = new List<Guid>();

                await using (var recentCmd = new NpgsqlCommand(recentReviewsSql, connection))
                {
                    recentCmd.Parameters.AddWithValue("@email", email);

                    await using var reader = await recentCmd.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        var reviewId = reader.GetGuid(0);
                        reviewIds.Add(reviewId);

                        recentReviews.Add(new
                        {
                            id = reviewId,
                            rating = reader.GetInt16(1),
                            title = reader.IsDBNull(2) ? null : reader.GetString(2),
                            body = reader.IsDBNull(3) ? null : reader.GetString(3),
                            createdAtUtc = reader.GetDateTime(4),
                            businessName = reader.GetString(5),
                            businessSlug = reader.GetString(6),
                        });
                    }
                }

                var reviewedCategoryCountsSql = """
                    SELECT
                        c.name,
                        COUNT(*)::int AS count
                    FROM users u
                    INNER JOIN reviews r
                        ON r.user_id = u.id
                    INNER JOIN business_categories bc
                        ON bc.business_id = r.business_id
                    INNER JOIN categories c
                        ON c.id = bc.category_id
                    WHERE u.email = @email
                    GROUP BY c.name
                    ORDER BY count DESC, c.name;
                    """;

                var reviewedCategoryCounts = new List<object>();

                await using (var categoryCmd = new NpgsqlCommand(reviewedCategoryCountsSql, connection))
                {
                    categoryCmd.Parameters.AddWithValue("@email", email);

                    await using var reader = await categoryCmd.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        reviewedCategoryCounts.Add(new
                        {
                            categoryName = reader.GetString(0),
                            count = reader.GetInt32(1)
                        });
                    }
                }

                var positiveTagTotalsSql = """
                    SELECT
                        rpt.tag_name,
                        COUNT(*)::int AS count
                    FROM users u
                    INNER JOIN reviews r
                        ON r.user_id = u.id
                    INNER JOIN review_positive_tags rpt
                        ON rpt.review_id = r.id
                    WHERE u.email = @email
                    GROUP BY rpt.tag_name
                    ORDER BY count DESC, rpt.tag_name;
                    """;

                var positiveTagTotals = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                {
                    ["service"] = 0,
                    ["quality"] = 0,
                    ["cleanliness"] = 0,
                    ["value"] = 0,
                    ["experience"] = 0
                };

                await using (var tagCmd = new NpgsqlCommand(positiveTagTotalsSql, connection))
                {
                    tagCmd.Parameters.AddWithValue("@email", email);

                    await using var reader = await tagCmd.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        var tagName = reader.GetString(0);
                        var count = reader.GetInt32(1);
                        positiveTagTotals[tagName] = count;
                    }
                }

                return Ok(new
                {
                    recentReviews,
                    reviewedCategoryCounts,
                    positiveTagTotals = new
                    {
                        service = positiveTagTotals["service"],
                        quality = positiveTagTotals["quality"],
                        cleanliness = positiveTagTotals["cleanliness"],
                        value = positiveTagTotals["value"],
                        experience = positiveTagTotals["experience"]
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(GetActivity));
                return StatusCode(500, new
                {
                    message = "An unexpected error occurred.",

                });
            }
        }
    }
}