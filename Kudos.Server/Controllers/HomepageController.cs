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

        public HomepageController(IConfiguration configuration)
        {
            _configuration = configuration;
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

                    var featuredSql = """
                        SELECT
                            b.id,
                            b.name,
                            b.slug,
                            b.city,
                            b.state,
                            bp.original_url,
                            COALESCE(AVG(r.rating), 0)::numeric(10,2) AS average_rating,
                            COUNT(DISTINCT r.id)::int AS review_count,
                            COALESCE(
                                ARRAY_REMOVE(ARRAY_AGG(DISTINCT c2.name), NULL),
                                ARRAY[]::text[]
                            ) AS category_names
                        FROM businesses b
                        INNER JOIN business_categories bc
                            ON bc.business_id = b.id
                        INNER JOIN categories c
                            ON c.id = bc.category_id
                        LEFT JOIN LATERAL (
                            SELECT original_url
                            FROM business_photos
                            WHERE business_id = b.id
                            ORDER BY is_primary DESC, created_at_utc DESC
                            LIMIT 1
                        ) bp ON true
                        LEFT JOIN reviews r
                            ON r.business_id = b.id
                        LEFT JOIN business_categories bc2
                            ON bc2.business_id = b.id
                        LEFT JOIN categories c2
                            ON c2.id = bc2.category_id
                        WHERE c.parent_slug = @parent_slug
                        GROUP BY
                            b.id,
                            b.name,
                            b.slug,
                            b.city,
                            b.state,
                            bp.original_url
                        ORDER BY RANDOM()
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
                Console.WriteLine("===== ERROR =====");
                Console.WriteLine(ex.ToString());
                Console.WriteLine("=================");

                return StatusCode(500, new
                {
                    message = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }
    }
}