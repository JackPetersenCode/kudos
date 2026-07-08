using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/public/homepage")]
    public class HomepageController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        private static readonly (string Name, string Slug)[] MainCategories =
        [
            ("Food & Drink", "food-drink"),
            ("Shopping", "shopping"),
            ("Health & Beauty", "health-beauty"),
            ("Home & Auto", "home-auto"),
            ("Professional Services", "professional-services"),
            ("Entertainment & Recreation", "entertainment-recreation"),
        ];

        private readonly ILogger<HomepageController> _logger;

        public HomepageController(IConfiguration configuration, ILogger<HomepageController> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        [HttpGet("category-slides")]
        public async Task<IActionResult> GetCategorySlides()
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var slides = new List<object>();

                foreach (var mainCategory in MainCategories)
                {
                    var subcategoriesSql = """
                        SELECT name, slug
                        FROM categories
                        WHERE parent_slug = @parent_slug
                        ORDER BY name;
                        """;

                    var subcategories = new List<object>();

                    await using (var subcategoriesCmd = new NpgsqlCommand(subcategoriesSql, connection))
                    {
                        subcategoriesCmd.Parameters.AddWithValue("@parent_slug", mainCategory.Slug);

                        await using var subcategoriesReader = await subcategoriesCmd.ExecuteReaderAsync();

                        while (await subcategoriesReader.ReadAsync())
                        {
                            subcategories.Add(new
                            {
                                name = subcategoriesReader.GetString(0),
                                slug = subcategoriesReader.GetString(1),
                            });
                        }
                    }

                    // Fast random pick: get a random business with a photo in this category
                    var featuredSql = """
                        WITH candidates AS (
                            SELECT b.id
                            FROM businesses b
                            INNER JOIN business_categories bc ON bc.business_id = b.id
                            INNER JOIN categories c ON c.id = bc.category_id
                            INNER JOIN business_photos bp ON bp.business_id = b.id
                            WHERE c.parent_slug = @parent_slug
                            ORDER BY b.id
                            OFFSET floor(random() * GREATEST(
                                (SELECT COUNT(*) FROM businesses b2
                                 INNER JOIN business_categories bc2 ON bc2.business_id = b2.id
                                 INNER JOIN categories c2 ON c2.id = bc2.category_id
                                 INNER JOIN business_photos bp2 ON bp2.business_id = b2.id
                                 WHERE c2.parent_slug = @parent_slug), 1))
                            LIMIT 1
                        )
                        SELECT
                            b.id, b.name, b.slug, b.city, b.state,
                            (SELECT original_url FROM business_photos WHERE business_id = b.id ORDER BY is_primary DESC LIMIT 1),
                            COALESCE((SELECT AVG(rating)::numeric(10,2) FROM reviews WHERE business_id = b.id), 0),
                            (SELECT COUNT(*)::int FROM reviews WHERE business_id = b.id),
                            COALESCE(
                                (SELECT ARRAY_AGG(DISTINCT c3.name) FROM business_categories bc3
                                 JOIN categories c3 ON c3.id = bc3.category_id WHERE bc3.business_id = b.id),
                                ARRAY[]::text[]
                            )
                        FROM businesses b
                        WHERE b.id = (SELECT id FROM candidates)
                        LIMIT 1;
                        """;

                    object? featuredBusiness = null;

                    await using (var featuredCmd = new NpgsqlCommand(featuredSql, connection))
                    {
                        featuredCmd.Parameters.AddWithValue("@parent_slug", mainCategory.Slug);

                        await using var featuredReader = await featuredCmd.ExecuteReaderAsync();

                        if (await featuredReader.ReadAsync())
                        {
                            featuredBusiness = new
                            {
                                id = featuredReader.GetGuid(0),
                                name = featuredReader.GetString(1),
                                slug = featuredReader.GetString(2),
                                city = featuredReader.IsDBNull(3) ? null : featuredReader.GetString(3),
                                state = featuredReader.IsDBNull(4) ? null : featuredReader.GetString(4),
                                primaryPhotoUrl = featuredReader.IsDBNull(5) ? null : featuredReader.GetString(5),
                                averageRating = featuredReader.GetDecimal(6),
                                reviewCount = featuredReader.GetInt32(7),
                                categories = featuredReader.IsDBNull(8)
                                    ? Array.Empty<string>()
                                    : featuredReader.GetFieldValue<string[]>(8),
                            };
                        }
                    }

                    slides.Add(new
                    {
                        mainCategory = new
                        {
                            name = mainCategory.Name,
                            slug = mainCategory.Slug,
                        },
                        subcategories,
                        featuredBusiness,
                    });
                }

                return Ok(new { slides });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(GetCategorySlides));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpGet("trending")]
        public async Task<IActionResult> GetTrending()
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        b.id, b.name, b.slug, b.city, b.state,
                        (SELECT original_url FROM business_photos bp WHERE bp.business_id = b.id ORDER BY is_primary DESC LIMIT 1) AS photo_url,
                        COALESCE(AVG(r.rating), 0)::numeric(10,2) AS average_rating,
                        COUNT(r.id)::int AS recent_review_count,
                        COALESCE(
                            (SELECT ARRAY_AGG(DISTINCT c.name) FROM business_categories bc
                             JOIN categories c ON c.id = bc.category_id
                             WHERE bc.business_id = b.id),
                            ARRAY[]::text[]
                        ) AS category_names
                    FROM businesses b
                    INNER JOIN reviews r ON r.business_id = b.id
                    WHERE r.created_at_utc >= now() - INTERVAL '30 days'
                    GROUP BY b.id, b.name, b.slug, b.city, b.state
                    ORDER BY recent_review_count DESC, average_rating DESC
                    LIMIT 8;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                await using var reader = await cmd.ExecuteReaderAsync();
                var results = new List<object>();

                while (await reader.ReadAsync())
                {
                    results.Add(new
                    {
                        id = reader.GetGuid(0),
                        name = reader.GetString(1),
                        slug = reader.GetString(2),
                        city = reader.IsDBNull(3) ? null : reader.GetString(3),
                        state = reader.IsDBNull(4) ? null : reader.GetString(4),
                        photoUrl = reader.IsDBNull(5) ? null : reader.GetString(5),
                        averageRating = reader.GetDecimal(6),
                        recentReviewCount = reader.GetInt32(7),
                        categories = reader.IsDBNull(8) ? Array.Empty<string>() : reader.GetFieldValue<string[]>(8)
                    });
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(GetTrending));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpGet("recent")]
        public async Task<IActionResult> GetRecentlyAdded()
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        b.id, b.name, b.slug, b.city, b.state,
                        (SELECT original_url FROM business_photos bp WHERE bp.business_id = b.id ORDER BY is_primary DESC LIMIT 1) AS photo_url,
                        COALESCE(
                            (SELECT ARRAY_AGG(DISTINCT c.name) FROM business_categories bc
                             JOIN categories c ON c.id = bc.category_id
                             WHERE bc.business_id = b.id),
                            ARRAY[]::text[]
                        ) AS category_names
                    FROM businesses b
                    WHERE b.yelp_id IS NULL
                    ORDER BY b.created_at_utc DESC
                    LIMIT 8;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                await using var reader = await cmd.ExecuteReaderAsync();
                var results = new List<object>();

                while (await reader.ReadAsync())
                {
                    results.Add(new
                    {
                        id = reader.GetGuid(0),
                        name = reader.GetString(1),
                        slug = reader.GetString(2),
                        city = reader.IsDBNull(3) ? null : reader.GetString(3),
                        state = reader.IsDBNull(4) ? null : reader.GetString(4),
                        photoUrl = reader.IsDBNull(5) ? null : reader.GetString(5),
                        categories = reader.IsDBNull(6) ? Array.Empty<string>() : reader.GetFieldValue<string[]>(6)
                    });
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(GetRecentlyAdded));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }
    }
}