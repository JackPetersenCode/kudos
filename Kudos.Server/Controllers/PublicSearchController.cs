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
        private readonly ILogger<PublicSearchController> _logger;

        public PublicSearchController(IConfiguration configuration, ILogger<PublicSearchController> logger)
        {
            _configuration = configuration;
            _logger = logger;
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
            [FromQuery] decimal? west,
            [FromQuery] decimal? minRating,
            [FromQuery] string? sort,
            [FromQuery] decimal? lat,
            [FromQuery] decimal? lng,
            [FromQuery] int? radiusMiles,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
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

                // Support "City, ST" location strings (from the location autocomplete):
                // match the city and state parts separately so "Austin, TX" resolves
                // precisely instead of a plain %Austin, TX% that matches nothing.
                string? whereCityPattern = null;
                string? whereStatePattern = null;
                if (!string.IsNullOrWhiteSpace(whereValue) && whereValue.Contains(','))
                {
                    var parts = whereValue.Split(',', 2);
                    var cityPart = parts[0].Trim();
                    var statePart = parts.Length > 1 ? parts[1].Trim() : "";
                    if (cityPart.Length > 0) whereCityPattern = $"%{cityPart}%";
                    if (statePart.Length > 0) whereStatePattern = $"%{statePart}%";
                }
                var categoryValue = category?.Trim();
                var cityValue = city?.Trim();

                // A near-me search with NO radius forces an unbounded haversine
                // distance sort over the entire ~323k-row catalog, which blows the
                // DB statement timeout (Sentry: TimeoutException at ExecuteReader for
                // e.g. category=restaurant&sort=distance with lat/lng, no radius).
                // Whenever we have a user location, always apply a bounding radius so
                // the lat/lng box pre-filters rows first. The UI's max radius is 100
                // miles; "Any Distance" near-me becomes that bound. This keeps every
                // geo search well under a second.
                if (lat.HasValue && lng.HasValue)
                {
                    radiusMiles = Math.Clamp(radiusMiles ?? 100, 1, 100);
                }

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
                            b.price_level,
                            b.is_premium,
                            b.is_verified
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
                                (@where_city::text IS NOT NULL
                                    AND b.city ILIKE @where_city
                                    AND (@where_state::text IS NULL OR b.state ILIKE @where_state)) OR
                                (@where_city::text IS NULL
                                    AND (b.city ILIKE @where_pattern OR b.state ILIKE @where_pattern)))
                            AND
                            (
                                (@category::text IS NULL)
                                OR c.slug = @category
                                OR c.parent_slug = @category
                            )
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
                            AND
                            (
                                @user_lat::numeric IS NULL
                                OR @user_lng::numeric IS NULL
                                OR @radius_miles::int IS NULL
                                OR (
                                    b.latitude IS NOT NULL
                                    AND b.longitude IS NOT NULL
                                    AND b.latitude BETWEEN @user_lat - (@radius_miles::numeric / 69.0)
                                                       AND @user_lat + (@radius_miles::numeric / 69.0)
                                    AND b.longitude BETWEEN @user_lng - (@radius_miles::numeric / (69.0 * cos(radians(@user_lat))))
                                                        AND @user_lng + (@radius_miles::numeric / (69.0 * cos(radians(@user_lat))))
                                    AND (
                                        3959 * acos(
                                            LEAST(1.0, cos(radians(@user_lat)) * cos(radians(b.latitude))
                                            * cos(radians(b.longitude) - radians(@user_lng))
                                            + sin(radians(@user_lat)) * sin(radians(b.latitude)))
                                        )
                                    ) <= @radius_miles
                                )
                            )
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
                        ) AS category_names,
                        f.is_premium,
                        f.is_verified,
                        CASE WHEN @user_lat::numeric IS NOT NULL AND @user_lng::numeric IS NOT NULL
                             AND f.latitude IS NOT NULL AND f.longitude IS NOT NULL
                        THEN ROUND((3959 * acos(
                            LEAST(1.0, cos(radians(@user_lat)) * cos(radians(f.latitude))
                            * cos(radians(f.longitude) - radians(@user_lng))
                            + sin(radians(@user_lat)) * sin(radians(f.latitude)))
                        ))::numeric, 1)
                        ELSE NULL END AS distance_miles,
                        EXISTS (
                            SELECT 1 FROM business_hours bh
                            WHERE bh.business_id = f.id AND bh.is_closed = FALSE
                            AND (
                                (bh.day_of_week = EXTRACT(DOW FROM now())::int
                                 AND bh.close_time > bh.open_time
                                 AND now()::time >= bh.open_time AND now()::time < bh.close_time)
                                OR
                                (bh.day_of_week = EXTRACT(DOW FROM now())::int
                                 AND bh.close_time <= bh.open_time
                                 AND now()::time >= bh.open_time)
                            )
                        ) AS is_open_now
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
                        f.is_premium,
                        f.is_verified,
                        bp.original_url
                    HAVING
                        (@min_rating::numeric IS NULL OR COALESCE(AVG(r.rating), 0) >= @min_rating)
                    ORDER BY
                    """ + (sort switch
                    {
                        "rating" => " f.is_premium DESC, average_rating DESC, review_count DESC, f.name ",
                        "name" => " f.is_premium DESC, f.name ASC, average_rating DESC ",
                        "newest" => " f.is_premium DESC, MAX(f.id) DESC ",
                        "distance" when lat != null && lng != null => " f.is_premium DESC, (CASE WHEN f.latitude IS NOT NULL THEN 3959 * acos(LEAST(1.0, cos(radians(@user_lat)) * cos(radians(f.latitude)) * cos(radians(f.longitude) - radians(@user_lng)) + sin(radians(@user_lat)) * sin(radians(f.latitude)))) ELSE 99999 END) ASC, f.name ",
                        _ => " f.is_premium DESC, review_count DESC, average_rating DESC, f.name "
                    }) + $"""
                    LIMIT {Math.Clamp(pageSize, 1, 50)} OFFSET {Math.Max(0, (page - 1) * Math.Clamp(pageSize, 1, 50))};
                    """;

                await using var cmd = new NpgsqlCommand(resultsSql, connection);

                cmd.Parameters.Add("@what", NpgsqlDbType.Text).Value = (object?)what ?? DBNull.Value;
                cmd.Parameters.Add("@what_pattern", NpgsqlDbType.Text).Value = $"%{what}%";
                cmd.Parameters.Add("@where", NpgsqlDbType.Text).Value = (object?)whereValue ?? DBNull.Value;
                cmd.Parameters.Add("@where_pattern", NpgsqlDbType.Text).Value = $"%{whereValue}%";
                cmd.Parameters.Add("@where_city", NpgsqlDbType.Text).Value = (object?)whereCityPattern ?? DBNull.Value;
                cmd.Parameters.Add("@where_state", NpgsqlDbType.Text).Value = (object?)whereStatePattern ?? DBNull.Value;
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
                cmd.Parameters.Add("@min_rating", NpgsqlDbType.Numeric).Value = (object?)minRating ?? DBNull.Value;
                cmd.Parameters.Add("@user_lat", NpgsqlDbType.Numeric).Value = (object?)lat ?? DBNull.Value;
                cmd.Parameters.Add("@user_lng", NpgsqlDbType.Numeric).Value = (object?)lng ?? DBNull.Value;
                cmd.Parameters.Add("@radius_miles", NpgsqlDbType.Integer).Value = (object?)radiusMiles ?? DBNull.Value;

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
                        categories = categoryNames,
                        isPremium = reader.GetBoolean(13),
                        isVerified = reader.GetBoolean(14),
                        distanceMiles = reader.IsDBNull(15) ? (decimal?)null : reader.GetDecimal(15),
                        isOpenNow = reader.GetBoolean(16)
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

                // Category counts use all filters EXCEPT the category filter itself,
                // so users can always see all available categories for their search.
                var filteredNoCategoryCte = $"""
                    WITH filtered_no_cat AS (
                        SELECT DISTINCT b.id
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
                                (@where_city::text IS NOT NULL
                                    AND b.city ILIKE @where_city
                                    AND (@where_state::text IS NULL OR b.state ILIKE @where_state)) OR
                                (@where_city::text IS NULL
                                    AND (b.city ILIKE @where_pattern OR b.state ILIKE @where_pattern)))
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
                            AND
                            (
                                @user_lat::numeric IS NULL
                                OR @user_lng::numeric IS NULL
                                OR @radius_miles::int IS NULL
                                OR (
                                    b.latitude IS NOT NULL
                                    AND b.longitude IS NOT NULL
                                    AND b.latitude BETWEEN @user_lat - (@radius_miles::numeric / 69.0)
                                                       AND @user_lat + (@radius_miles::numeric / 69.0)
                                    AND b.longitude BETWEEN @user_lng - (@radius_miles::numeric / (69.0 * cos(radians(@user_lat))))
                                                        AND @user_lng + (@radius_miles::numeric / (69.0 * cos(radians(@user_lat))))
                                    AND (
                                        3959 * acos(
                                            LEAST(1.0, cos(radians(@user_lat)) * cos(radians(b.latitude))
                                            * cos(radians(b.longitude) - radians(@user_lng))
                                            + sin(radians(@user_lat)) * sin(radians(b.latitude)))
                                        )
                                    ) <= @radius_miles
                                )
                            )
                    )
                    """;

                var categoryCountsSql = filteredNoCategoryCte + """
                    SELECT
                        c.slug,
                        c.name,
                        COUNT(DISTINCT fnc.id)::int AS count
                    FROM categories c
                    INNER JOIN business_categories bc
                        ON bc.category_id = c.id
                    INNER JOIN filtered_no_cat fnc
                        ON fnc.id = bc.business_id
                    -- Show specific category pills, hiding only the 6 top-level
                    -- groups. Excluding by slug (rather than parent_slug IS NOT
                    -- NULL) is robust to categories whose parent_slug wasn't set
                    -- during import (e.g. bar/salon/coffee-shop), which would
                    -- otherwise vanish from the pills.
                    WHERE c.slug NOT IN (
                        'food-drink', 'shopping', 'health-beauty',
                        'home-auto', 'professional-services', 'entertainment-recreation'
                    )
                    GROUP BY c.slug, c.name
                    HAVING COUNT(DISTINCT fnc.id) > 0
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

                await categoryReader.CloseAsync();

                // Total count for pagination
                var totalCountSql = filteredCte + " SELECT COUNT(*)::int FROM filtered;";
                int totalCount;
                await using (var totalCmd = new NpgsqlCommand(totalCountSql, connection))
                {
                    foreach (NpgsqlParameter p in cmd.Parameters)
                    {
                        totalCmd.Parameters.AddWithValue(p.ParameterName, p.NpgsqlDbType, p.Value!);
                    }
                    totalCount = (int)(await totalCmd.ExecuteScalarAsync() ?? 0);
                }

                return Ok(new
                {
                    results,
                    cityCounts,
                    categoryCounts,
                    totalCount,
                    page,
                    pageSize = Math.Clamp(pageSize, 1, 50)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(Search));
                return StatusCode(500, new
                {
                    message = "An unexpected error occurred.",

                });
            }
        }
    }
}