using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Security.Claims;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/admin/stats")]
    [Authorize]
    public class AdminStatsController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public AdminStatsController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GetSiteStats()
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value ??
                            User.FindFirst(ClaimTypes.Name)?.Value ??
                            User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var adminSql = "SELECT role FROM users WHERE email = @email LIMIT 1;";
                await using (var cmd = new NpgsqlCommand(adminSql, connection))
                {
                    cmd.Parameters.AddWithValue("@email", email);
                    var role = await cmd.ExecuteScalarAsync();
                    if (role?.ToString() != "admin") return Forbid();
                }

                // Gather all stats
                var stats = new Dictionary<string, object>();

                // Users
                await AddScalar(connection, stats, "totalUsers", "SELECT COUNT(*)::int FROM users;");
                await AddScalar(connection, stats, "usersLast30Days", "SELECT COUNT(*)::int FROM users WHERE created_at_utc >= now() - INTERVAL '30 days';");

                // Businesses
                await AddScalar(connection, stats, "totalBusinesses", "SELECT COUNT(*)::int FROM businesses;");
                await AddScalar(connection, stats, "importedBusinesses", "SELECT COUNT(*)::int FROM businesses WHERE yelp_id IS NOT NULL;");
                await AddScalar(connection, stats, "userCreatedBusinesses", "SELECT COUNT(*)::int FROM businesses WHERE yelp_id IS NULL;");
                await AddScalar(connection, stats, "premiumBusinesses", "SELECT COUNT(*)::int FROM businesses WHERE is_premium = TRUE;");

                // Reviews
                await AddScalar(connection, stats, "totalReviews", "SELECT COUNT(*)::int FROM reviews;");
                await AddScalar(connection, stats, "reviewsLast30Days", "SELECT COUNT(*)::int FROM reviews WHERE created_at_utc >= now() - INTERVAL '30 days';");

                // Ads
                await AddScalar(connection, stats, "totalAds", "SELECT COUNT(*)::int FROM ads;");
                await AddScalar(connection, stats, "activeAds", "SELECT COUNT(*)::int FROM ads WHERE status = 'active';");

                // Revenue (total budget of active campaigns)
                await AddScalar(connection, stats, "totalAdRevenueCents",
                    "SELECT COALESCE(SUM(budget_cents), 0)::int FROM ad_campaigns ac INNER JOIN ads a ON a.id = ac.ad_id WHERE a.status = 'active';");

                // Check-ins
                await AddScalar(connection, stats, "totalCheckIns", "SELECT COUNT(*)::int FROM check_ins;");

                // Favorites
                await AddScalar(connection, stats, "totalFavorites", "SELECT COUNT(*)::int FROM user_favorites;");

                // Staff kudos
                await AddScalar(connection, stats, "totalStaffKudos", "SELECT COUNT(*)::int FROM staff_kudos;");

                // Pending claims
                await AddScalar(connection, stats, "pendingClaims", "SELECT COUNT(*)::int FROM business_claims WHERE status = 'pending';");

                // Ad impressions & clicks
                await AddScalar(connection, stats, "totalAdImpressions", "SELECT COUNT(*)::int FROM ad_impressions;");
                await AddScalar(connection, stats, "totalAdClicks", "SELECT COUNT(*)::int FROM ad_clicks;");

                // Reviews by month (last 6 months)
                var monthSql = """
                    SELECT TO_CHAR(created_at_utc, 'YYYY-MM') AS month, COUNT(*)::int AS count
                    FROM reviews
                    WHERE created_at_utc >= now() - INTERVAL '6 months'
                    GROUP BY month
                    ORDER BY month ASC;
                    """;

                var reviewsByMonth = new List<object>();
                await using (var cmd = new NpgsqlCommand(monthSql, connection))
                {
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        reviewsByMonth.Add(new { month = reader.GetString(0), count = reader.GetInt32(1) });
                    }
                }

                stats["reviewsByMonth"] = reviewsByMonth;

                // Users by month (last 6 months)
                var userMonthSql = """
                    SELECT TO_CHAR(created_at_utc, 'YYYY-MM') AS month, COUNT(*)::int AS count
                    FROM users
                    WHERE created_at_utc >= now() - INTERVAL '6 months'
                    GROUP BY month
                    ORDER BY month ASC;
                    """;

                var usersByMonth = new List<object>();
                await using (var cmd = new NpgsqlCommand(userMonthSql, connection))
                {
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        usersByMonth.Add(new { month = reader.GetString(0), count = reader.GetInt32(1) });
                    }
                }

                stats["usersByMonth"] = usersByMonth;

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private static async Task AddScalar(NpgsqlConnection connection, Dictionary<string, object> stats, string key, string sql)
        {
            await using var cmd = new NpgsqlCommand(sql, connection);
            stats[key] = (int)(await cmd.ExecuteScalarAsync() ?? 0);
        }
    }
}
