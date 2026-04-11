using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/public/search")]
    public class PublicSearchController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public PublicSearchController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> Search(
            [FromQuery] string? q,
            [FromQuery] string? where,
            [FromQuery] string? category,
            [FromQuery] string? city,
            [FromQuery] short? price,
            [FromQuery] bool? openNow,
            [FromQuery] bool? reservations,
            [FromQuery] bool? onlineWaitlist,
            [FromQuery] bool? delivery,
            [FromQuery] bool? takeout,
            [FromQuery] bool? outdoorSeating,
            [FromQuery] decimal? north,
            [FromQuery] decimal? south,
            [FromQuery] decimal? east,
            [FromQuery] decimal? west)
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");

                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                var what = q?.Trim();
                var whereValue = where?.Trim();
                var categoryValue = category?.Trim();
                var cityValue = city?.Trim();

                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var openNowSqlCondition = """
                    (
                        @open_now::boolean IS NULL
                        OR EXISTS (
                            SELECT 1
                            FROM business_hours bh
                            WHERE bh.business_id = b.id
                              AND bh.is_closed = FALSE
                              AND (
                                    (
                                        bh.day_of_week = EXTRACT(DOW FROM timezone(b.time_zone, now()))::int
                                        AND (
                                            (
                                                bh.close_time > bh.open_time
                                                AND timezone(b.time_zone, now())::time >= bh.open_time
                                                AND timezone(b.time_zone, now())::time < bh.close_time
                                            )
                                            OR
                                            (
                                                bh.close_time <= bh.open_time
                                                AND timezone(b.time_zone, now())::time >= bh.open_time
                                            )
                                        )
                                    )
                                    OR
                                    (
                                        bh.day_of_week = ((EXTRACT(DOW FROM timezone(b.time_zone, now()))::int + 6) % 7)
                                        AND bh.close_time <= bh.open_time
                                        AND timezone(b.time_zone, now())::time < bh.close_time
                                    )
                                )
                        )
                    )
                    """;

                var boundsSqlCondition = """
                    (
                        @north::numeric IS NULL
                        OR @south::numeric IS NULL
                        OR @east::numeric IS NULL
                        OR @west::numeric IS NULL
                        OR (
                            b.latitude IS NOT NULL
                            AND b.longitude IS NOT NULL
                            AND b.latitude <= @north
                            AND b.latitude >= @south
                            AND b.longitude <= @east
                            AND b.longitude >= @west
                        )
                    )
                    """;

                var filteredCte = $"""
                    WITH filtered AS (
                        SELECT DISTINCT
                            b.id,
                            b.name,
                            b.slug,
                            b.description,
                            b.city,
                            b.state,
                            b.postal_code,
                            b.latitude,
                            b.longitude,
                            b.price_level
                        FROM businesses b
                        LEFT JOIN business_categories bc
                            ON bc.business_id = b.id
                        LEFT JOIN categories c
                            ON c.id = bc.category_id
                        WHERE
                            ((@what::text IS NULL) OR
                                b.name ILIKE @what_pattern OR
                                b.description ILIKE @what_pattern OR
                                c.name ILIKE @what_pattern)
                            AND
                            ((@where::text IS NULL) OR
                                b.city ILIKE @where_pattern OR
                                b.state ILIKE @where_pattern)
                            AND
                            ((@category::text IS NULL) OR
                                c.slug = @category)
                            AND
                            ((@city::text IS NULL) OR
                                b.city ILIKE @city_pattern)
                            AND
                            ((@price::smallint IS NULL) OR
                                b.price_level = @price)
                            AND
                            {openNowSqlCondition}
                            AND
                            ((@reservations::boolean IS NULL) OR
                                b.accepts_reservations = @reservations)
                            AND
                            ((@online_waitlist::boolean IS NULL) OR
                                b.offers_online_waitlist = @online_waitlist)
                            AND
                            ((@delivery::boolean IS NULL) OR
                                b.offers_delivery = @delivery)
                            AND
                            ((@takeout::boolean IS NULL) OR
                                b.offers_takeout = @takeout)
                            AND
                            ((@outdoor_seating::boolean IS NULL) OR
                                b.outdoor_seating = @outdoor_seating)
                            AND
                            {boundsSqlCondition}
                    )
                    """;

                var resultsSql = filteredCte + """
                    SELECT
                        f.id,
                        f.name,
                        f.slug,
                        f.description,
                        f.city,
                        f.state,
                        f.postal_code,
                        f.latitude,
                        f.longitude,
                        bp.original_url,
                        COALESCE(AVG(r.rating), 0)::numeric(10,2) AS average_rating,
                        COUNT(DISTINCT r.id)::int AS review_count,
                        COALESCE(
                            ARRAY_REMOVE(ARRAY_AGG(DISTINCT c2.name), NULL),
                            ARRAY[]::text[]
                        ) AS category_names
                    FROM filtered f
                    LEFT JOIN LATERAL (
                        SELECT original_url
                        FROM business_photos
                        WHERE business_id = f.id
                        ORDER BY is_primary DESC, created_at_utc DESC
                        LIMIT 1
                    ) bp ON true
                    LEFT JOIN reviews r
                        ON r.business_id = f.id
                    LEFT JOIN business_categories bc2
                        ON bc2.business_id = f.id
                    LEFT JOIN categories c2
                        ON c2.id = bc2.category_id
                    GROUP BY
                        f.id,
                        f.name,
                        f.slug,
                        f.description,
                        f.city,
                        f.state,
                        f.postal_code,
                        f.latitude,
                        f.longitude,
                        bp.original_url
                    ORDER BY
                        review_count DESC,
                        average_rating DESC,
                        f.name
                    LIMIT 100;
                    """;

                await using var cmd = new NpgsqlCommand(resultsSql, connection);

                cmd.Parameters.Add("@what", NpgsqlDbType.Text).Value = (object?)what ?? DBNull.Value;
                cmd.Parameters.Add("@what_pattern", NpgsqlDbType.Text).Value = $"%{what}%";
                cmd.Parameters.Add("@where", NpgsqlDbType.Text).Value = (object?)whereValue ?? DBNull.Value;
                cmd.Parameters.Add("@where_pattern", NpgsqlDbType.Text).Value = $"%{whereValue}%";
                cmd.Parameters.Add("@category", NpgsqlDbType.Text).Value = (object?)categoryValue ?? DBNull.Value;
                cmd.Parameters.Add("@city", NpgsqlDbType.Text).Value = (object?)cityValue ?? DBNull.Value;
                cmd.Parameters.Add("@city_pattern", NpgsqlDbType.Text).Value = $"%{cityValue}%";
                cmd.Parameters.Add("@price", NpgsqlDbType.Smallint).Value = (object?)price ?? DBNull.Value;
                cmd.Parameters.Add("@open_now", NpgsqlDbType.Boolean).Value = (object?)openNow ?? DBNull.Value;
                cmd.Parameters.Add("@reservations", NpgsqlDbType.Boolean).Value = (object?)reservations ?? DBNull.Value;
                cmd.Parameters.Add("@online_waitlist", NpgsqlDbType.Boolean).Value = (object?)onlineWaitlist ?? DBNull.Value;
                cmd.Parameters.Add("@delivery", NpgsqlDbType.Boolean).Value = (object?)delivery ?? DBNull.Value;
                cmd.Parameters.Add("@takeout", NpgsqlDbType.Boolean).Value = (object?)takeout ?? DBNull.Value;
                cmd.Parameters.Add("@outdoor_seating", NpgsqlDbType.Boolean).Value = (object?)outdoorSeating ?? DBNull.Value;
                cmd.Parameters.Add("@north", NpgsqlDbType.Numeric).Value = (object?)north ?? DBNull.Value;
                cmd.Parameters.Add("@south", NpgsqlDbType.Numeric).Value = (object?)south ?? DBNull.Value;
                cmd.Parameters.Add("@east", NpgsqlDbType.Numeric).Value = (object?)east ?? DBNull.Value;
                cmd.Parameters.Add("@west", NpgsqlDbType.Numeric).Value = (object?)west ?? DBNull.Value;

                await using var reader = await cmd.ExecuteReaderAsync();

                var results = new List<object>();

                while (await reader.ReadAsync())
                {
                    var categoryNames = reader.IsDBNull(12)
                        ? Array.Empty<string>()
                        : reader.GetFieldValue<string[]>(12);

                    results.Add(new
                    {
                        id = reader.GetGuid(0),
                        name = reader.GetString(1),
                        slug = reader.GetString(2),
                        description = reader.IsDBNull(3) ? null : reader.GetString(3),
                        city = reader.IsDBNull(4) ? null : reader.GetString(4),
                        state = reader.IsDBNull(5) ? null : reader.GetString(5),
                        postalCode = reader.IsDBNull(6) ? null : reader.GetString(6),
                        latitude = reader.IsDBNull(7) ? null : (decimal?)reader.GetDecimal(7),
                        longitude = reader.IsDBNull(8) ? null : (decimal?)reader.GetDecimal(8),
                        primaryPhotoUrl = reader.IsDBNull(9) ? null : reader.GetString(9),
                        averageRating = reader.GetDecimal(10),
                        reviewCount = reader.GetInt32(11),
                        categories = categoryNames
                    });
                }

                await reader.CloseAsync();

                var cityCountsSql = filteredCte + """
                    SELECT
                        city,
                        COUNT(*)::int AS count
                    FROM filtered
                    WHERE city IS NOT NULL
                    GROUP BY city
                    ORDER BY count DESC, city;
                    """;

                await using var cityCmd = new NpgsqlCommand(cityCountsSql, connection);
                foreach (NpgsqlParameter p in cmd.Parameters)
                {
                    cityCmd.Parameters.AddWithValue(p.ParameterName, p.NpgsqlDbType, p.Value);
                }

                await using var cityReader = await cityCmd.ExecuteReaderAsync();
                var cityCounts = new List<object>();

                while (await cityReader.ReadAsync())
                {
                    cityCounts.Add(new
                    {
                        city = cityReader.GetString(0),
                        count = cityReader.GetInt32(1)
                    });
                }

                await cityReader.CloseAsync();

                var categoryCountsSql = filteredCte + """
                    SELECT
                        c.slug,
                        c.name,
                        COUNT(DISTINCT f.id)::int AS count
                    FROM categories c
                    LEFT JOIN business_categories bc
                        ON bc.category_id = c.id
                    LEFT JOIN filtered f
                        ON f.id = bc.business_id
                    GROUP BY c.slug, c.name
                    HAVING COUNT(DISTINCT f.id) > 0
                    ORDER BY count DESC, c.name;
                    """;

                await using var categoryCmd = new NpgsqlCommand(categoryCountsSql, connection);
                foreach (NpgsqlParameter p in cmd.Parameters)
                {
                    categoryCmd.Parameters.AddWithValue(p.ParameterName, p.NpgsqlDbType, p.Value);
                }

                await using var categoryReader = await categoryCmd.ExecuteReaderAsync();
                var categoryCounts = new List<object>();

                while (await categoryReader.ReadAsync())
                {
                    categoryCounts.Add(new
                    {
                        slug = categoryReader.GetString(0),
                        name = categoryReader.GetString(1),
                        count = categoryReader.GetInt32(2)
                    });
                }

                return Ok(new
                {
                    results,
                    cityCounts,
                    categoryCounts
                });
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