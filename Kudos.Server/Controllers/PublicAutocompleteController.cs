using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/public/autocomplete")]
    public class PublicAutocompleteController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<PublicAutocompleteController> _logger;

        public PublicAutocompleteController(IConfiguration configuration, ILogger<PublicAutocompleteController> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        // Dedicated, lightweight city autocomplete for the location field (Yelp-style).
        // Prefix match, cities only — avoids the business/category queries the full
        // autocomplete runs, so it stays fast on every keystroke.
        [HttpGet("cities")]
        public async Task<IActionResult> Cities([FromQuery] string q)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 1)
                    return Ok(new { cities = Array.Empty<object>() });

                var term = q.Trim();
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var citySql = """
                    SELECT city, state, COUNT(*)::int AS count
                    FROM businesses
                    WHERE city IS NOT NULL AND city ILIKE @pattern
                    GROUP BY city, state
                    ORDER BY count DESC, city
                    LIMIT 8;
                    """;

                var cities = new List<object>();
                await using var cmd = new NpgsqlCommand(citySql, connection);
                cmd.Parameters.AddWithValue("@pattern", $"{term}%");
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    cities.Add(new
                    {
                        city = reader.GetString(0),
                        state = reader.IsDBNull(1) ? null : reader.GetString(1),
                        count = reader.GetInt32(2)
                    });
                }

                return Ok(new { cities });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(Cities));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpGet]
        public async Task<IActionResult> Autocomplete([FromQuery] string q)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                    return Ok(new { businesses = Array.Empty<object>(), categories = Array.Empty<object>(), cities = Array.Empty<object>() });

                var term = q.Trim();
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                // Business name matches
                var bizSql = """
                    SELECT b.name, b.slug, b.city, b.state,
                           (SELECT original_url FROM business_photos bp WHERE bp.business_id = b.id ORDER BY bp.is_primary DESC LIMIT 1) AS photo_url,
                           (SELECT COUNT(*)::int FROM reviews r WHERE r.business_id = b.id) AS review_count,
                           COALESCE(
                               (SELECT ARRAY_AGG(DISTINCT c.name) FROM business_categories bc
                                JOIN categories c ON c.id = bc.category_id
                                WHERE bc.business_id = b.id),
                               ARRAY[]::text[]
                           ) AS category_names
                    FROM businesses b
                    WHERE b.name ILIKE @pattern
                    ORDER BY
                        CASE WHEN b.is_premium THEN 0 ELSE 1 END,
                        LENGTH(b.name) ASC
                    LIMIT 6;
                    """;

                var businesses = new List<object>();
                await using (var cmd = new NpgsqlCommand(bizSql, connection))
                {
                    cmd.Parameters.AddWithValue("@pattern", $"%{term}%");
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        businesses.Add(new
                        {
                            name = reader.GetString(0),
                            slug = reader.GetString(1),
                            city = reader.IsDBNull(2) ? null : reader.GetString(2),
                            state = reader.IsDBNull(3) ? null : reader.GetString(3),
                            photoUrl = reader.IsDBNull(4) ? null : reader.GetString(4),
                            reviewCount = reader.GetInt32(5),
                            categories = reader.IsDBNull(6) ? Array.Empty<string>() : reader.GetFieldValue<string[]>(6)
                        });
                    }
                }

                // Category matches
                var catSql = """
                    SELECT name, slug
                    FROM categories
                    WHERE name ILIKE @pattern AND parent_slug IS NOT NULL
                    ORDER BY name
                    LIMIT 5;
                    """;

                var categories = new List<object>();
                await using (var cmd = new NpgsqlCommand(catSql, connection))
                {
                    cmd.Parameters.AddWithValue("@pattern", $"%{term}%");
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        categories.Add(new
                        {
                            name = reader.GetString(0),
                            slug = reader.GetString(1)
                        });
                    }
                }

                // City matches
                var citySql = """
                    SELECT DISTINCT city, state, COUNT(*)::int AS count
                    FROM businesses
                    WHERE city ILIKE @pattern AND city IS NOT NULL
                    GROUP BY city, state
                    ORDER BY count DESC
                    LIMIT 5;
                    """;

                var cities = new List<object>();
                await using (var cmd = new NpgsqlCommand(citySql, connection))
                {
                    cmd.Parameters.AddWithValue("@pattern", $"%{term}%");
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        cities.Add(new
                        {
                            city = reader.GetString(0),
                            state = reader.IsDBNull(1) ? null : reader.GetString(1),
                            count = reader.GetInt32(2)
                        });
                    }
                }

                return Ok(new { businesses, categories, cities });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(Autocomplete));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }
    }
}
