using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Kudos.Server.Data;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BusinessController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public BusinessController(IConfiguration configuration, HttpClient httpClient)
        {
            _configuration = configuration;
            _httpClient = httpClient;
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateBusiness([FromBody] CreateBusinessRequest request)
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

                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    return BadRequest("Name is required.");
                }

                if (string.IsNullOrWhiteSpace(request.TimeZone))
                {
                    request.TimeZone = "America/Chicago";
                }

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                Guid userId;

                var getUserSql = """
                    SELECT id
                    FROM users
                    WHERE email = @email
                    LIMIT 1;
                    """;

                await using (var getUserCmd = new NpgsqlCommand(getUserSql, connection))
                {
                    getUserCmd.Parameters.AddWithValue("@email", email);

                    var result = await getUserCmd.ExecuteScalarAsync();
                    if (result == null)
                    {
                        return NotFound("User not found.");
                    }

                    userId = (Guid)result;
                }

                var baseSlug = Slugify(string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug);

                if (string.IsNullOrWhiteSpace(baseSlug))
                {
                    return BadRequest("Could not generate a valid slug.");
                }

                var finalSlug = await GenerateUniqueSlugAsync(connection, baseSlug);

                decimal? latitude = null;
                decimal? longitude = null;

                var fullAddress = BuildAddress(request);
                if (!string.IsNullOrWhiteSpace(fullAddress))
                {
                    var geocodeResult = await GeocodeAddressAsync(fullAddress);
                    latitude = geocodeResult.Latitude;
                    longitude = geocodeResult.Longitude;
                }

                var businessId = Guid.NewGuid();

                var insertBusinessSql = """
                    INSERT INTO businesses (
                        id,
                        name,
                        slug,
                        description,
                        phone,
                        website_url,
                        address1,
                        address2,
                        city,
                        state,
                        postal_code,
                        latitude,
                        longitude,
                        price_level,
                        accepts_reservations,
                        offers_online_waitlist,
                        offers_delivery,
                        offers_takeout,
                        outdoor_seating,
                        time_zone,
                        created_at_utc
                    )
                    VALUES (
                        @id,
                        @name,
                        @slug,
                        @description,
                        @phone,
                        @website_url,
                        @address1,
                        @address2,
                        @city,
                        @state,
                        @postal_code,
                        @latitude,
                        @longitude,
                        @price_level,
                        @accepts_reservations,
                        @offers_online_waitlist,
                        @offers_delivery,
                        @offers_takeout,
                        @outdoor_seating,
                        @time_zone,
                        @created_at_utc
                    );
                    """;

                await using (var insertBusinessCmd = new NpgsqlCommand(insertBusinessSql, connection))
                {
                    insertBusinessCmd.Parameters.AddWithValue("@id", businessId);
                    insertBusinessCmd.Parameters.AddWithValue("@name", request.Name);
                    insertBusinessCmd.Parameters.AddWithValue("@slug", finalSlug);

                    insertBusinessCmd.Parameters.AddWithValue("@description", (object?)request.Description ?? DBNull.Value);
                    insertBusinessCmd.Parameters.AddWithValue("@phone", (object?)request.Phone ?? DBNull.Value);
                    insertBusinessCmd.Parameters.AddWithValue("@website_url", (object?)request.WebsiteUrl ?? DBNull.Value);
                    insertBusinessCmd.Parameters.AddWithValue("@address1", (object?)request.Address1 ?? DBNull.Value);
                    insertBusinessCmd.Parameters.AddWithValue("@address2", (object?)request.Address2 ?? DBNull.Value);
                    insertBusinessCmd.Parameters.AddWithValue("@city", (object?)request.City ?? DBNull.Value);
                    insertBusinessCmd.Parameters.AddWithValue("@state", (object?)request.State ?? DBNull.Value);
                    insertBusinessCmd.Parameters.AddWithValue("@postal_code", (object?)request.PostalCode ?? DBNull.Value);
                    insertBusinessCmd.Parameters.AddWithValue("@latitude", (object?)latitude ?? DBNull.Value);
                    insertBusinessCmd.Parameters.AddWithValue("@longitude", (object?)longitude ?? DBNull.Value);
                    insertBusinessCmd.Parameters.AddWithValue("@price_level", (object?)request.PriceLevel ?? DBNull.Value);
                    insertBusinessCmd.Parameters.AddWithValue("@accepts_reservations", request.AcceptsReservations);
                    insertBusinessCmd.Parameters.AddWithValue("@offers_online_waitlist", request.OffersOnlineWaitlist);
                    insertBusinessCmd.Parameters.AddWithValue("@offers_delivery", request.OffersDelivery);
                    insertBusinessCmd.Parameters.AddWithValue("@offers_takeout", request.OffersTakeout);
                    insertBusinessCmd.Parameters.AddWithValue("@outdoor_seating", request.OutdoorSeating);
                    insertBusinessCmd.Parameters.AddWithValue("@time_zone", request.TimeZone);
                    insertBusinessCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await insertBusinessCmd.ExecuteNonQueryAsync();
                }

                var insertMembershipSql = """
                    INSERT INTO business_memberships (
                        id,
                        business_id,
                        user_id,
                        membership_role,
                        created_at_utc
                    )
                    VALUES (
                        @id,
                        @business_id,
                        @user_id,
                        @membership_role,
                        @created_at_utc
                    );
                    """;

                await using (var insertMembershipCmd = new NpgsqlCommand(insertMembershipSql, connection))
                {
                    insertMembershipCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    insertMembershipCmd.Parameters.AddWithValue("@business_id", businessId);
                    insertMembershipCmd.Parameters.AddWithValue("@user_id", userId);
                    insertMembershipCmd.Parameters.AddWithValue("@membership_role", "owner");
                    insertMembershipCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await insertMembershipCmd.ExecuteNonQueryAsync();
                }

                if (request.CategorySlugs != null && request.CategorySlugs.Count > 0)
                {
                    foreach (var categorySlug in request.CategorySlugs
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => x.Trim().ToLowerInvariant())
                        .Distinct())
                    {
                        var insertCategoryLinkSql = """
                            INSERT INTO business_categories (id, business_id, category_id)
                            SELECT @id, @business_id, c.id
                            FROM categories c
                            WHERE c.slug = @category_slug
                            ON CONFLICT (business_id, category_id) DO NOTHING;
                            """;

                        await using var categoryCmd = new NpgsqlCommand(insertCategoryLinkSql, connection);
                        categoryCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                        categoryCmd.Parameters.AddWithValue("@business_id", businessId);
                        categoryCmd.Parameters.AddWithValue("@category_slug", categorySlug);

                        await categoryCmd.ExecuteNonQueryAsync();
                    }
                }

                if (request.Hours != null && request.Hours.Count > 0)
                {
                    foreach (var hour in request.Hours
                        .Where(h => h.DayOfWeek >= 0 && h.DayOfWeek <= 6)
                        .GroupBy(h => h.DayOfWeek)
                        .Select(g => g.First()))
                    {
                        var insertHoursSql = """
                            INSERT INTO business_hours (
                                id,
                                business_id,
                                day_of_week,
                                open_time,
                                close_time,
                                is_closed,
                                created_at_utc
                            )
                            VALUES (
                                @id,
                                @business_id,
                                @day_of_week,
                                @open_time,
                                @close_time,
                                @is_closed,
                                @created_at_utc
                            );
                            """;

                        await using var hourCmd = new NpgsqlCommand(insertHoursSql, connection);
                        hourCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                        hourCmd.Parameters.AddWithValue("@business_id", businessId);
                        hourCmd.Parameters.AddWithValue("@day_of_week", hour.DayOfWeek);

                        if (hour.IsClosed)
                        {
                            hourCmd.Parameters.AddWithValue("@open_time", DBNull.Value);
                            hourCmd.Parameters.AddWithValue("@close_time", DBNull.Value);
                        }
                        else
                        {
                            hourCmd.Parameters.AddWithValue("@open_time", TimeOnly.Parse(hour.OpenTime ?? "09:00"));
                            hourCmd.Parameters.AddWithValue("@close_time", TimeOnly.Parse(hour.CloseTime ?? "17:00"));
                        }

                        hourCmd.Parameters.AddWithValue("@is_closed", hour.IsClosed);
                        hourCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                        await hourCmd.ExecuteNonQueryAsync();
                    }
                }

                return Ok(new
                {
                    businessId,
                    request.Name,
                    slug = finalSlug,
                    latitude,
                    longitude,
                    membershipRole = "owner"
                });
            }
            catch (PostgresException ex) when (ex.SqlState == "23505")
            {
                return BadRequest("A business with that slug already exists.");
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

        [HttpGet("{slug}")]
        [Authorize]
        public async Task<IActionResult> GetBusinessBySlug(string slug)
        {
            try
            {
                var email =
                    User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ??
                    User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ??
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
        
                await using var connection = new Npgsql.NpgsqlConnection(connectionString);
                await connection.OpenAsync();
        
                var sql = """
                    SELECT
                        b.id,
                        b.name,
                        b.slug,
                        b.description,
                        b.phone,
                        b.website_url,
                        b.address1,
                        b.address2,
                        b.city,
                        b.state,
                        b.postal_code,
                        b.latitude,
                        b.longitude,
                        b.price_level,
                        b.accepts_reservations,
                        b.offers_online_waitlist,
                        b.offers_delivery,
                        b.offers_takeout,
                        b.outdoor_seating,
                        b.time_zone,
                        b.created_at_utc,
                        bm.membership_role,
                        COALESCE(
                            ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.slug), NULL),
                            ARRAY[]::text[]
                        ) AS category_slugs
                    FROM users u
                    INNER JOIN business_memberships bm
                        ON bm.user_id = u.id
                    INNER JOIN businesses b
                        ON b.id = bm.business_id
                    LEFT JOIN business_categories bc
                        ON bc.business_id = b.id
                    LEFT JOIN categories c
                        ON c.id = bc.category_id
                    WHERE u.email = @email
                      AND b.slug = @slug
                    GROUP BY
                        b.id,
                        b.name,
                        b.slug,
                        b.description,
                        b.phone,
                        b.website_url,
                        b.address1,
                        b.address2,
                        b.city,
                        b.state,
                        b.postal_code,
                        b.latitude,
                        b.longitude,
                        b.price_level,
                        b.accepts_reservations,
                        b.offers_online_waitlist,
                        b.offers_delivery,
                        b.offers_takeout,
                        b.outdoor_seating,
                        b.time_zone,
                        b.created_at_utc,
                        bm.membership_role
                    LIMIT 1;
                    """;
        
                await using var cmd = new Npgsql.NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@email", email);
                cmd.Parameters.AddWithValue("@slug", slug);
        
                await using var reader = await cmd.ExecuteReaderAsync();
        
                if (!await reader.ReadAsync())
                {
                    return NotFound("Business not found or you do not have access.");
                }
        
                var categorySlugs = reader.IsDBNull(22)
                    ? Array.Empty<string>()
                    : reader.GetFieldValue<string[]>(22);
        
                var result = new
                {
                    id = reader.GetGuid(0),
                    name = reader.GetString(1),
                    slug = reader.GetString(2),
                    description = reader.IsDBNull(3) ? null : reader.GetString(3),
                    phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                    websiteUrl = reader.IsDBNull(5) ? null : reader.GetString(5),
                    address1 = reader.IsDBNull(6) ? null : reader.GetString(6),
                    address2 = reader.IsDBNull(7) ? null : reader.GetString(7),
                    city = reader.IsDBNull(8) ? null : reader.GetString(8),
                    state = reader.IsDBNull(9) ? null : reader.GetString(9),
                    postalCode = reader.IsDBNull(10) ? null : reader.GetString(10),
                    latitude = reader.IsDBNull(11) ? null : (decimal?)reader.GetDecimal(11),
                    longitude = reader.IsDBNull(12) ? null : (decimal?)reader.GetDecimal(12),
                    priceLevel = reader.IsDBNull(13) ? null : (short?)reader.GetInt16(13),
                    acceptsReservations = reader.GetBoolean(14),
                    offersOnlineWaitlist = reader.GetBoolean(15),
                    offersDelivery = reader.GetBoolean(16),
                    offersTakeout = reader.GetBoolean(17),
                    outdoorSeating = reader.GetBoolean(18),
                    timeZone = reader.GetString(19),
                    createdAtUtc = reader.GetDateTime(20),
                    membershipRole = reader.GetString(21),
                    categories = categorySlugs
                };
        
                return Ok(result);
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
        [HttpPut("{slug}")]
        [Authorize]
        public async Task<IActionResult> UpdateBusiness(string slug, [FromBody] CreateBusinessRequest request)
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

                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    return BadRequest("Name is required.");
                }

                if (string.IsNullOrWhiteSpace(request.TimeZone))
                {
                    request.TimeZone = "America/Chicago";
                }

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                Guid businessId;

                var accessSql = """
                    SELECT b.id
                    FROM users u
                    INNER JOIN business_memberships bm
                        ON bm.user_id = u.id
                    INNER JOIN businesses b
                        ON b.id = bm.business_id
                    WHERE u.email = @email
                      AND b.slug = @slug
                    LIMIT 1;
                    """;

                await using (var accessCmd = new NpgsqlCommand(accessSql, connection))
                {
                    accessCmd.Parameters.AddWithValue("@email", email);
                    accessCmd.Parameters.AddWithValue("@slug", slug);

                    var result = await accessCmd.ExecuteScalarAsync();
                    if (result == null)
                    {
                        return NotFound("Business not found or you do not have access.");
                    }

                    businessId = (Guid)result;
                }

                decimal? latitude = null;
                decimal? longitude = null;

                var fullAddress = BuildAddress(request);
                if (!string.IsNullOrWhiteSpace(fullAddress))
                {
                    var geocodeResult = await GeocodeAddressAsync(fullAddress);
                    latitude = geocodeResult.Latitude;
                    longitude = geocodeResult.Longitude;
                }

                var updateSql = """
                    UPDATE businesses
                    SET
                        name = @name,
                        description = @description,
                        phone = @phone,
                        website_url = @website_url,
                        address1 = @address1,
                        address2 = @address2,
                        city = @city,
                        state = @state,
                        postal_code = @postal_code,
                        latitude = @latitude,
                        longitude = @longitude,
                        price_level = @price_level,
                        accepts_reservations = @accepts_reservations,
                        offers_online_waitlist = @offers_online_waitlist,
                        offers_delivery = @offers_delivery,
                        offers_takeout = @offers_takeout,
                        outdoor_seating = @outdoor_seating,
                        time_zone = @time_zone
                    WHERE id = @business_id;
                    """;

                await using (var updateCmd = new NpgsqlCommand(updateSql, connection))
                {
                    updateCmd.Parameters.AddWithValue("@business_id", businessId);
                    updateCmd.Parameters.AddWithValue("@name", request.Name);
                    updateCmd.Parameters.AddWithValue("@description", (object?)request.Description ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@phone", (object?)request.Phone ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@website_url", (object?)request.WebsiteUrl ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@address1", (object?)request.Address1 ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@address2", (object?)request.Address2 ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@city", (object?)request.City ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@state", (object?)request.State ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@postal_code", (object?)request.PostalCode ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@latitude", (object?)latitude ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@longitude", (object?)longitude ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@price_level", (object?)request.PriceLevel ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@accepts_reservations", request.AcceptsReservations);
                    updateCmd.Parameters.AddWithValue("@offers_online_waitlist", request.OffersOnlineWaitlist);
                    updateCmd.Parameters.AddWithValue("@offers_delivery", request.OffersDelivery);
                    updateCmd.Parameters.AddWithValue("@offers_takeout", request.OffersTakeout);
                    updateCmd.Parameters.AddWithValue("@outdoor_seating", request.OutdoorSeating);
                    updateCmd.Parameters.AddWithValue("@time_zone", request.TimeZone);

                    await updateCmd.ExecuteNonQueryAsync();
                }

                var deleteCategorySql = """
                    DELETE FROM business_categories
                    WHERE business_id = @business_id;
                    """;

                await using (var deleteCategoryCmd = new NpgsqlCommand(deleteCategorySql, connection))
                {
                    deleteCategoryCmd.Parameters.AddWithValue("@business_id", businessId);
                    await deleteCategoryCmd.ExecuteNonQueryAsync();
                }

                if (request.CategorySlugs != null && request.CategorySlugs.Count > 0)
                {
                    foreach (var categorySlug in request.CategorySlugs
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => x.Trim().ToLowerInvariant())
                        .Distinct())
                    {
                        var insertCategoryLinkSql = """
                            INSERT INTO business_categories (id, business_id, category_id)
                            SELECT @id, @business_id, c.id
                            FROM categories c
                            WHERE c.slug = @category_slug
                            ON CONFLICT (business_id, category_id) DO NOTHING;
                            """;

                        await using var categoryCmd = new NpgsqlCommand(insertCategoryLinkSql, connection);
                        categoryCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                        categoryCmd.Parameters.AddWithValue("@business_id", businessId);
                        categoryCmd.Parameters.AddWithValue("@category_slug", categorySlug);

                        await categoryCmd.ExecuteNonQueryAsync();
                    }
                }

                var deleteHoursSql = """
                    DELETE FROM business_hours
                    WHERE business_id = @business_id;
                    """;

                await using (var deleteHoursCmd = new NpgsqlCommand(deleteHoursSql, connection))
                {
                    deleteHoursCmd.Parameters.AddWithValue("@business_id", businessId);
                    await deleteHoursCmd.ExecuteNonQueryAsync();
                }

                if (request.Hours != null && request.Hours.Count > 0)
                {
                    foreach (var hour in request.Hours
                        .Where(h => h.DayOfWeek >= 0 && h.DayOfWeek <= 6)
                        .GroupBy(h => h.DayOfWeek)
                        .Select(g => g.First()))
                    {
                        var insertHoursSql = """
                            INSERT INTO business_hours (
                                id,
                                business_id,
                                day_of_week,
                                open_time,
                                close_time,
                                is_closed,
                                created_at_utc
                            )
                            VALUES (
                                @id,
                                @business_id,
                                @day_of_week,
                                @open_time,
                                @close_time,
                                @is_closed,
                                @created_at_utc
                            );
                            """;

                        await using var hourCmd = new NpgsqlCommand(insertHoursSql, connection);
                        hourCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                        hourCmd.Parameters.AddWithValue("@business_id", businessId);
                        hourCmd.Parameters.AddWithValue("@day_of_week", hour.DayOfWeek);

                        if (hour.IsClosed)
                        {
                            hourCmd.Parameters.AddWithValue("@open_time", DBNull.Value);
                            hourCmd.Parameters.AddWithValue("@close_time", DBNull.Value);
                        }
                        else
                        {
                            hourCmd.Parameters.AddWithValue("@open_time", TimeOnly.Parse(hour.OpenTime ?? "09:00"));
                            hourCmd.Parameters.AddWithValue("@close_time", TimeOnly.Parse(hour.CloseTime ?? "17:00"));
                        }

                        hourCmd.Parameters.AddWithValue("@is_closed", hour.IsClosed);
                        hourCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                        await hourCmd.ExecuteNonQueryAsync();
                    }
                }

                return Ok(new
                {
                    businessId,
                    slug,
                    name = request.Name,
                    latitude,
                    longitude
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
        
        private string BuildAddress(CreateBusinessRequest request)
        {
            var parts = new[]
            {
                request.Address1,
                request.Address2,
                request.City,
                request.State,
                request.PostalCode
            }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.Trim());

            return string.Join(", ", parts);
        }

        [HttpPut("{businessId:guid}")]
        [Authorize]
        public async Task<IActionResult> UpdateBusiness(Guid businessId, [FromBody] UpdateBusinessRequest request)
        {
            try
            {
                var email =
                    User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ??
                    User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ??
                    User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                {
                    return Unauthorized("Email claim not found in token.");
                }

                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    return BadRequest("Name is required.");
                }

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                await using var connection = new Npgsql.NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var accessSql = """
                    SELECT bm.membership_role
                    FROM users u
                    INNER JOIN business_memberships bm
                        ON bm.user_id = u.id
                    WHERE u.email = @email
                      AND bm.business_id = @business_id
                    LIMIT 1;
                    """;

                string? membershipRole;

                await using (var accessCmd = new Npgsql.NpgsqlCommand(accessSql, connection))
                {
                    accessCmd.Parameters.AddWithValue("@email", email);
                    accessCmd.Parameters.AddWithValue("@business_id", businessId);

                    var result = await accessCmd.ExecuteScalarAsync();
                    membershipRole = result?.ToString();
                }

                if (string.IsNullOrWhiteSpace(membershipRole))
                {
                    return Forbid();
                }

                if (membershipRole != "owner" && membershipRole != "admin" && membershipRole != "manager")
                {
                    return Forbid();
                }

                decimal? latitude = null;
                decimal? longitude = null;

                var fullAddress = string.Join(", ", new[]
                {
                    request.Address1,
                    request.Address2,
                    request.City,
                    request.State,
                    request.PostalCode
                }.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!.Trim()));

                if (!string.IsNullOrWhiteSpace(fullAddress))
                {
                    try
                    {
                        var geocodeResult = await GeocodeAddressAsync(fullAddress);
                        latitude = geocodeResult.Latitude;
                        longitude = geocodeResult.Longitude;
                    }
                    catch
                    {
                        // Keep nulls if geocoding fails; do not block the edit
                    }
                }

                var updateSql = """
                    UPDATE businesses
                    SET
                        name = @name,
                        description = @description,
                        phone = @phone,
                        website_url = @website_url,
                        address1 = @address1,
                        address2 = @address2,
                        city = @city,
                        state = @state,
                        postal_code = @postal_code,
                        latitude = @latitude,
                        longitude = @longitude,
                        price_level = @price_level,
                        accepts_reservations = @accepts_reservations,
                        offers_online_waitlist = @offers_online_waitlist,
                        offers_delivery = @offers_delivery,
                        offers_takeout = @offers_takeout,
                        outdoor_seating = @outdoor_seating,
                        time_zone = @time_zone
                    WHERE id = @business_id;
                    """;

                await using (var updateCmd = new Npgsql.NpgsqlCommand(updateSql, connection))
                {
                    updateCmd.Parameters.AddWithValue("@business_id", businessId);
                    updateCmd.Parameters.AddWithValue("@name", request.Name);
                    updateCmd.Parameters.AddWithValue("@description", (object?)request.Description ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@phone", (object?)request.Phone ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@website_url", (object?)request.WebsiteUrl ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@address1", (object?)request.Address1 ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@address2", (object?)request.Address2 ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@city", (object?)request.City ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@state", (object?)request.State ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@postal_code", (object?)request.PostalCode ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@latitude", (object?)latitude ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@longitude", (object?)longitude ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@price_level", (object?)request.PriceLevel ?? DBNull.Value);
                    updateCmd.Parameters.AddWithValue("@accepts_reservations", request.AcceptsReservations);
                    updateCmd.Parameters.AddWithValue("@offers_online_waitlist", request.OffersOnlineWaitlist);
                    updateCmd.Parameters.AddWithValue("@offers_delivery", request.OffersDelivery);
                    updateCmd.Parameters.AddWithValue("@offers_takeout", request.OffersTakeout);
                    updateCmd.Parameters.AddWithValue("@outdoor_seating", request.OutdoorSeating);
                    updateCmd.Parameters.AddWithValue("@time_zone", request.TimeZone);

                    var rows = await updateCmd.ExecuteNonQueryAsync();

                    if (rows == 0)
                    {
                        return NotFound("Business not found.");
                    }
                }

                var deleteCategoriesSql = """
                    DELETE FROM business_categories
                    WHERE business_id = @business_id;
                    """;

                await using (var deleteCategoriesCmd = new Npgsql.NpgsqlCommand(deleteCategoriesSql, connection))
                {
                    deleteCategoriesCmd.Parameters.AddWithValue("@business_id", businessId);
                    await deleteCategoriesCmd.ExecuteNonQueryAsync();
                }

                var normalizedCategorySlugs = (request.CategorySlugs ?? new List<string>())
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim().ToLowerInvariant())
                    .Distinct()
                    .ToList();

                foreach (var categorySlug in normalizedCategorySlugs)
                {
                    var insertCategorySql = """
                        INSERT INTO business_categories (id, business_id, category_id)
                        SELECT @id, @business_id, c.id
                        FROM categories c
                        WHERE c.slug = @category_slug
                        ON CONFLICT (business_id, category_id) DO NOTHING;
                        """;

                    await using var categoryCmd = new Npgsql.NpgsqlCommand(insertCategorySql, connection);
                    categoryCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    categoryCmd.Parameters.AddWithValue("@business_id", businessId);
                    categoryCmd.Parameters.AddWithValue("@category_slug", categorySlug);

                    await categoryCmd.ExecuteNonQueryAsync();
                }

                return Ok(new
                {
                    businessId,
                    success = true
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

        private async Task<(decimal? Latitude, decimal? Longitude)> GeocodeAddressAsync(string address)
        {
            var apiKey = _configuration["GoogleMaps:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return (null, null);
            }

            var url =
                $"https://maps.googleapis.com/maps/api/geocode/json?address={Uri.EscapeDataString(address)}&key={Uri.EscapeDataString(apiKey)}";

            using var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                return (null, null);
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            var root = doc.RootElement;

            if (!root.TryGetProperty("status", out var statusEl))
            {
                return (null, null);
            }

            var status = statusEl.GetString();
            if (!string.Equals(status, "OK", StringComparison.OrdinalIgnoreCase))
            {
                return (null, null);
            }

            if (!root.TryGetProperty("results", out var resultsEl) || resultsEl.GetArrayLength() == 0)
            {
                return (null, null);
            }

            var location = resultsEl[0]
                .GetProperty("geometry")
                .GetProperty("location");

            var lat = location.GetProperty("lat").GetDecimal();
            var lng = location.GetProperty("lng").GetDecimal();

            return (lat, lng);
        }

        private static string Slugify(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "";
            }

            var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            var previousDash = false;

            foreach (var c in normalized)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory == UnicodeCategory.NonSpacingMark)
                {
                    continue;
                }

                if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9'))
                {
                    sb.Append(c);
                    previousDash = false;
                }
                else if (!previousDash)
                {
                    sb.Append('-');
                    previousDash = true;
                }
            }

            return sb.ToString().Trim('-');
        }

        private static async Task<string> GenerateUniqueSlugAsync(NpgsqlConnection connection, string baseSlug)
        {
            var slug = baseSlug;
            var counter = 2;

            while (true)
            {
                var sql = "SELECT COUNT(*) FROM businesses WHERE slug = @slug;";
                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@slug", slug);

                var count = (long)(await cmd.ExecuteScalarAsync() ?? 0L);

                if (count == 0)
                {
                    return slug;
                }

                slug = $"{baseSlug}-{counter}";
                counter++;
            }
        }
    }
}