using Kudos.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Security.Claims;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/admin/import")]
    [Authorize(Roles = "admin")]
    public class AdminImportController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IServiceProvider _serviceProvider;
        private readonly YelpImportService _yelpImport;
        private readonly YelpDatasetImportService _yelpDatasetImport;
        private readonly OpenStreetMapImportService _osmImport;
        private readonly ILogger<AdminImportController> _logger;

        public AdminImportController(
            IConfiguration configuration,
            IServiceProvider serviceProvider,
            YelpImportService yelpImport,
            YelpDatasetImportService yelpDatasetImport,
            OpenStreetMapImportService osmImport,
            ILogger<AdminImportController> logger)
        {
            _configuration = configuration;
            _serviceProvider = serviceProvider;
            _yelpImport = yelpImport;
            _yelpDatasetImport = yelpDatasetImport;
            _osmImport = osmImport;
            _logger = logger;
        }

        [HttpPost("yelp")]
        public async Task<IActionResult> ImportFromYelp([FromQuery] string location, [FromQuery] int maxPages = 5)
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value ??
                            User.FindFirst(ClaimTypes.Name)?.Value ??
                            User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized();

                // Verify admin
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var adminSql = "SELECT role FROM users WHERE email = @email LIMIT 1;";
                await using (var cmd = new NpgsqlCommand(adminSql, connection))
                {
                    cmd.Parameters.AddWithValue("@email", email);
                    var role = await cmd.ExecuteScalarAsync();
                    if (role?.ToString() != "admin")
                        return Forbid();
                }

                if (string.IsNullOrWhiteSpace(location))
                    return BadRequest("location query parameter is required.");

                var result = await _yelpImport.ImportBusinesses(location, maxPages);

                return Ok(new
                {
                    location,
                    maxPages,
                    result.Imported,
                    result.Skipped,
                    result.Failed
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(ImportFromYelp));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("yelp-dataset")]
        public async Task<IActionResult> ImportFromYelpDataset([FromQuery] string filePath, [FromQuery] string? states = null)
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

                if (string.IsNullOrWhiteSpace(filePath))
                    return BadRequest("filePath query parameter is required (path to yelp_academic_dataset_business.json).");

                var filterStates = string.IsNullOrWhiteSpace(states)
                    ? null
                    : states.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

                var result = await _yelpDatasetImport.ImportFromFile(filePath, filterStates);

                return Ok(new
                {
                    source = "yelp-dataset",
                    filePath,
                    filterStates,
                    result.Imported,
                    result.Skipped,
                    result.Failed
                });
            }
            catch (FileNotFoundException ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(ImportFromYelpDataset));
                return BadRequest(new { message = "An unexpected error occurred." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(ImportFromYelpDataset));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("osm/all")]
        public async Task<IActionResult> ImportAllCitiesFromOsm()
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

                // Run in background so the request doesn't timeout
                _ = Task.Run(async () =>
                {
                    using var scope = _serviceProvider.CreateScope();
                    var osmService = scope.ServiceProvider.GetRequiredService<OpenStreetMapImportService>();
                    var logger = scope.ServiceProvider.GetRequiredService<ILogger<AdminImportController>>();

                    int totalImported = 0, totalSkipped = 0, totalFailed = 0, citiesProcessed = 0;

                    foreach (var (city, state) in UsCities.All)
                    {
                        try
                        {
                            logger.LogInformation("OSM bulk import: {City}, {State} ({Index}/{Total})",
                                city, state, citiesProcessed + 1, UsCities.All.Length);

                            var result = await osmService.ImportByCity(city, state);
                            totalImported += result.Imported;
                            totalSkipped += result.Skipped;
                            totalFailed += result.Failed;
                            citiesProcessed++;

                            logger.LogInformation("OSM {City}, {State}: +{Imported} imported ({TotalImported} total so far)",
                                city, state, result.Imported, totalImported);
                        }
                        catch (Exception ex)
                        {
                            logger.LogError(ex, "OSM bulk import failed for {City}, {State}", city, state);
                        }

                        // Respect Overpass API fair use: 2 second pause between queries
                        await Task.Delay(TimeSpan.FromSeconds(2));
                    }

                    logger.LogInformation(
                        "OSM bulk import COMPLETE: {Cities} cities, {Imported} imported, {Skipped} skipped, {Failed} failed",
                        citiesProcessed, totalImported, totalSkipped, totalFailed);
                });

                return Ok(new
                {
                    message = $"Bulk OSM import started for {UsCities.All.Length} cities. Check server logs for progress.",
                    totalCities = UsCities.All.Length
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(ImportAllCitiesFromOsm));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("osm")]
        public async Task<IActionResult> ImportFromOpenStreetMap([FromQuery] string city, [FromQuery] string state)
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

                if (string.IsNullOrWhiteSpace(city) || string.IsNullOrWhiteSpace(state))
                    return BadRequest("city and state query parameters are required.");

                var result = await _osmImport.ImportByCity(city, state);

                return Ok(new
                {
                    source = "openstreetmap",
                    city,
                    state,
                    result.Imported,
                    result.Skipped,
                    result.Failed
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(ImportFromOpenStreetMap));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("cleanup")]
        public async Task<IActionResult> CleanupBadData()
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

                // 1. Delete businesses with bad names
                var badNamesSql = """
                    DELETE FROM businesses
                    WHERE yelp_id IS NOT NULL
                      AND (
                        name ~ '^\$'
                        OR LENGTH(name) < 3
                        OR LENGTH(name) > 120
                        OR (LENGTH(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g')) < 2)
                        OR LOWER(name) IN (
                            'parking', 'atm', 'toilet', 'restroom', 'bench', 'trash',
                            'recycling', 'mailbox', 'fire hydrant', 'bus stop',
                            'vending machine', 'drinking water', 'telephone',
                            'post box', 'waste basket', 'parking lot', 'gas station',
                            'convenience store', 'test', 'unknown'
                        )
                      );
                    """;

                await using var badNamesCmd = new NpgsqlCommand(badNamesSql, connection);
                var deletedBadNames = await badNamesCmd.ExecuteNonQueryAsync();

                // 2. Remove duplicates: keep the one with the most data (longest address), delete the rest
                var dedupSql = """
                    DELETE FROM businesses
                    WHERE id IN (
                        SELECT id FROM (
                            SELECT
                                id,
                                ROW_NUMBER() OVER (
                                    PARTITION BY LOWER(TRIM(name)), LOWER(COALESCE(city, '')), LOWER(COALESCE(state, ''))
                                    ORDER BY
                                        CASE WHEN yelp_id NOT LIKE 'osm-%' THEN 0 ELSE 1 END,
                                        LENGTH(COALESCE(address1, '')) DESC,
                                        LENGTH(COALESCE(phone, '')) DESC,
                                        created_at_utc ASC
                                ) AS rn
                            FROM businesses
                        ) ranked
                        WHERE rn > 1
                    );
                    """;

                await using var dedupCmd = new NpgsqlCommand(dedupSql, connection);
                var deletedDupes = await dedupCmd.ExecuteNonQueryAsync();

                return Ok(new
                {
                    deletedBadNames,
                    deletedDuplicates = deletedDupes,
                    totalCleaned = deletedBadNames + deletedDupes
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(CleanupBadData));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("yelp-dataset-upsert")]
        public async Task<IActionResult> ImportYelpDatasetUpsert([FromQuery] string filePath, [FromQuery] string? states = null)
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

                Console.WriteLine($"=== YELP UPSERT: filePath = [{filePath}] ===");
                Console.WriteLine($"=== File exists: {System.IO.File.Exists(filePath)} ===");

                if (string.IsNullOrWhiteSpace(filePath) || !System.IO.File.Exists(filePath))
                    return BadRequest($"File not found: {filePath}");

                var filterStateSet = string.IsNullOrWhiteSpace(states) ? null
                    : new HashSet<string>(states.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries), StringComparer.OrdinalIgnoreCase);

                {
                    var connStr = connectionString;

                    await using var conn = new NpgsqlConnection(connStr);
                    await conn.OpenAsync();

                    // Create index for fast name+city lookups
                    try
                    {
                        await using var idxCmd = new NpgsqlCommand(
                            "CREATE INDEX IF NOT EXISTS idx_businesses_name_city_lower ON businesses (LOWER(TRIM(name)), LOWER(COALESCE(city, '')));",
                            conn);
                        await idxCmd.ExecuteNonQueryAsync();
                        Console.WriteLine("Index created for name+city lookup");
                    }
                    catch (Exception ex)
                    {
                    }

                    int updated = 0, skipped = 0, inserted = 0, lineNum = 0;

                    using var stream = System.IO.File.OpenRead(filePath);
                    using var reader = new System.IO.StreamReader(stream);

                    string? line;
                    while ((line = await reader.ReadLineAsync()) != null)
                    {
                        lineNum++;
                        if (lineNum % 500 == 0)
                            Console.WriteLine($"Yelp upsert: line {lineNum}, {updated} updated, {skipped} skipped");

                        try
                        {
                            using var doc = System.Text.Json.JsonDocument.Parse(line);
                            var biz = doc.RootElement;

                            var bizName = biz.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
                            var bizCity = biz.TryGetProperty("city", out var cityEl) ? cityEl.GetString() : null;
                            var bizState = biz.TryGetProperty("state", out var stateEl) ? stateEl.GetString() : null;
                            var bizId = biz.TryGetProperty("business_id", out var idEl) ? idEl.GetString() : null;

                            if (string.IsNullOrWhiteSpace(bizName)) { skipped++; continue; }

                            // Filter by state
                            if (filterStateSet != null && (string.IsNullOrWhiteSpace(bizState) || !filterStateSet.Contains(bizState)))
                            { skipped++; continue; }

                            var isClosed = biz.TryGetProperty("is_open", out var openEl) && openEl.GetInt32() == 0;

                            // Find existing business by yelp_id first, then by name+city
                            Guid? existingId = null;

                            var address = biz.TryGetProperty("address", out var addressEl) ? addressEl.GetString() : null;

                            // Match 1: by yelp_id (exact)
                            if (!string.IsNullOrWhiteSpace(bizId))
                            {
                                var findByYelpSql = "SELECT id FROM businesses WHERE yelp_id = @yelp_id LIMIT 1;";
                                await using (var fyCmd = new NpgsqlCommand(findByYelpSql, conn))
                                {
                                    fyCmd.Parameters.AddWithValue("@yelp_id", bizId);
                                    var result = await fyCmd.ExecuteScalarAsync();
                                    if (result != null) existingId = (Guid)result;
                                }
                            }

                            // Match 2: by exact name + city
                            if (existingId == null)
                            {
                                var findByNameSql = """
                                    SELECT id FROM businesses
                                    WHERE LOWER(TRIM(name)) = LOWER(TRIM(@name))
                                      AND LOWER(COALESCE(city, '')) = LOWER(COALESCE(@city, ''))
                                    LIMIT 1;
                                    """;

                                await using (var fnCmd = new NpgsqlCommand(findByNameSql, conn))
                                {
                                    fnCmd.Parameters.AddWithValue("@name", bizName);
                                    fnCmd.Parameters.AddWithValue("@city", (object?)bizCity ?? DBNull.Value);
                                    var result = await fnCmd.ExecuteScalarAsync();
                                    if (result != null) existingId = (Guid)result;
                                }
                            }

                            // Match 3: by address + city (catches name mismatches)
                            if (existingId == null && !string.IsNullOrWhiteSpace(address) && !string.IsNullOrWhiteSpace(bizCity))
                            {
                                var findByAddrSql = """
                                    SELECT id FROM businesses
                                    WHERE LOWER(TRIM(COALESCE(address1, ''))) = LOWER(TRIM(@address))
                                      AND LOWER(COALESCE(city, '')) = LOWER(COALESCE(@city, ''))
                                      AND address1 IS NOT NULL AND address1 != ''
                                    LIMIT 1;
                                    """;

                                await using (var faCmd = new NpgsqlCommand(findByAddrSql, conn))
                                {
                                    faCmd.Parameters.AddWithValue("@address", address);
                                    faCmd.Parameters.AddWithValue("@city", bizCity);
                                    var result = await faCmd.ExecuteScalarAsync();
                                    if (result != null) existingId = (Guid)result;
                                }
                            }

                            // Match 4: by coordinates (within ~50 meters, same city)
                            if (existingId == null && !string.IsNullOrWhiteSpace(bizCity))
                            {
                                decimal? yelpLat = biz.TryGetProperty("latitude", out var yLatEl) && yLatEl.ValueKind == System.Text.Json.JsonValueKind.Number ? yLatEl.GetDecimal() : null;
                                decimal? yelpLng = biz.TryGetProperty("longitude", out var yLngEl) && yLngEl.ValueKind == System.Text.Json.JsonValueKind.Number ? yLngEl.GetDecimal() : null;

                                if (yelpLat != null && yelpLng != null)
                                {
                                    var findByCoordsql = """
                                        SELECT id FROM businesses
                                        WHERE LOWER(COALESCE(city, '')) = LOWER(@city)
                                          AND latitude IS NOT NULL AND longitude IS NOT NULL
                                          AND ABS(latitude - @lat) < 0.0005
                                          AND ABS(longitude - @lng) < 0.0005
                                        LIMIT 1;
                                        """;

                                    await using (var fcCmd = new NpgsqlCommand(findByCoordsql, conn))
                                    {
                                        fcCmd.Parameters.AddWithValue("@city", bizCity);
                                        fcCmd.Parameters.AddWithValue("@lat", yelpLat.Value);
                                        fcCmd.Parameters.AddWithValue("@lng", yelpLng.Value);
                                        var result = await fcCmd.ExecuteScalarAsync();
                                        if (result != null) existingId = (Guid)result;
                                    }
                                }
                            }

                            // Extract remaining fields
                            var postalCode = biz.TryGetProperty("postal_code", out var zipEl) ? zipEl.GetString() : null;
                            decimal? lat = biz.TryGetProperty("latitude", out var latEl) && latEl.ValueKind == System.Text.Json.JsonValueKind.Number ? latEl.GetDecimal() : null;
                            decimal? lng = biz.TryGetProperty("longitude", out var lngEl) && lngEl.ValueKind == System.Text.Json.JsonValueKind.Number ? lngEl.GetDecimal() : null;

                            short? priceLevel = null;
                            if (biz.TryGetProperty("attributes", out var attrs) && attrs.ValueKind == System.Text.Json.JsonValueKind.Object)
                            {
                                if (attrs.TryGetProperty("RestaurantsPriceRange2", out var priceEl2))
                                {
                                    var ps = priceEl2.GetString();
                                    if (short.TryParse(ps, out var pl)) priceLevel = pl;
                                }
                            }

                            if (existingId == null && isClosed)
                            {
                                // Closed business with no match — skip entirely
                                skipped++;
                                continue;
                            }

                            if (existingId == null)
                            {
                                // INSERT new business
                                var slug = bizName.Trim().ToLowerInvariant().Replace(" ", "-").Replace("'", "").Replace("&", "and");
                                slug = System.Text.RegularExpressions.Regex.Replace(slug, "[^a-z0-9-]", "");
                                slug = System.Text.RegularExpressions.Regex.Replace(slug, "-+", "-").Trim('-');
                                if (slug.Length < 2) { skipped++; continue; }

                                // Make slug unique
                                var baseSlug = slug;
                                var counter = 2;
                                while (true)
                                {
                                    var checkSlugSql = "SELECT COUNT(*) FROM businesses WHERE slug = @slug;";
                                    await using var csCmd = new NpgsqlCommand(checkSlugSql, conn);
                                    csCmd.Parameters.AddWithValue("@slug", slug);
                                    var count = (long)(await csCmd.ExecuteScalarAsync() ?? 0L);
                                    if (count == 0) break;
                                    slug = $"{baseSlug}-{counter}";
                                    counter++;
                                }

                                var newId = Guid.NewGuid();
                                var insertBizSql = """
                                    INSERT INTO businesses (
                                        id, name, slug, address1, city, state, postal_code,
                                        latitude, longitude, price_level,
                                        accepts_reservations, offers_online_waitlist,
                                        offers_delivery, offers_takeout, outdoor_seating,
                                        time_zone, yelp_id, created_at_utc
                                    ) VALUES (
                                        @id, @name, @slug, @address, @city, @state, @postal_code,
                                        @lat, @lng, @price_level,
                                        FALSE, FALSE, FALSE, FALSE, FALSE,
                                        'America/Chicago', @yelp_id, @now
                                    );
                                    """;

                                await using (var insCmd = new NpgsqlCommand(insertBizSql, conn))
                                {
                                    insCmd.Parameters.AddWithValue("@id", newId);
                                    insCmd.Parameters.AddWithValue("@name", bizName);
                                    insCmd.Parameters.AddWithValue("@slug", slug);
                                    insCmd.Parameters.AddWithValue("@address", (object?)address ?? DBNull.Value);
                                    insCmd.Parameters.AddWithValue("@city", (object?)bizCity ?? DBNull.Value);
                                    insCmd.Parameters.AddWithValue("@state", (object?)bizState ?? DBNull.Value);
                                    insCmd.Parameters.AddWithValue("@postal_code", (object?)postalCode ?? DBNull.Value);
                                    insCmd.Parameters.AddWithValue("@lat", (object?)lat ?? DBNull.Value);
                                    insCmd.Parameters.AddWithValue("@lng", (object?)lng ?? DBNull.Value);
                                    insCmd.Parameters.AddWithValue("@price_level", (object?)priceLevel ?? DBNull.Value);
                                    insCmd.Parameters.AddWithValue("@yelp_id", (object?)bizId ?? DBNull.Value);
                                    insCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                                    await insCmd.ExecuteNonQueryAsync();
                                }

                                // Map categories
                                if (biz.TryGetProperty("categories", out var catsEl))
                                {
                                    var catsStr = catsEl.GetString();
                                    if (!string.IsNullOrWhiteSpace(catsStr))
                                    {
                                        var catNames = catsStr.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                                        foreach (var catName in catNames)
                                        {
                                            var catSlug = catName.Trim().ToLowerInvariant().Replace(" ", "-").Replace("&", "and").Replace("/", "-");
                                            var catSql = """
                                                INSERT INTO business_categories (id, business_id, category_id)
                                                SELECT @id, @bid, c.id FROM categories c WHERE c.slug = @slug
                                                ON CONFLICT (business_id, category_id) DO NOTHING;
                                                """;
                                            try
                                            {
                                                await using var catCmd = new NpgsqlCommand(catSql, conn);
                                                catCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                                                catCmd.Parameters.AddWithValue("@bid", newId);
                                                catCmd.Parameters.AddWithValue("@slug", catSlug);
                                                await catCmd.ExecuteNonQueryAsync();
                                            }
                                            catch { /* skip unmapped categories */ }
                                        }
                                    }
                                }

                                existingId = newId;
                                inserted++;
                            }
                            else
                            {
                                // Update existing — fill missing fields
                                var updateSql = """
                                    UPDATE businesses SET
                                        address1 = COALESCE(address1, @address),
                                        postal_code = COALESCE(postal_code, @postal_code),
                                        latitude = COALESCE(latitude, @latitude),
                                        longitude = COALESCE(longitude, @longitude),
                                        price_level = COALESCE(price_level, @price_level),
                                        yelp_id = @yelp_id
                                    WHERE id = @id;
                                    """;

                                await using (var updateCmd = new NpgsqlCommand(updateSql, conn))
                                {
                                    updateCmd.Parameters.AddWithValue("@id", existingId.Value);
                                    updateCmd.Parameters.AddWithValue("@address", (object?)address ?? DBNull.Value);
                                    updateCmd.Parameters.AddWithValue("@postal_code", (object?)postalCode ?? DBNull.Value);
                                    updateCmd.Parameters.AddWithValue("@latitude", (object?)lat ?? DBNull.Value);
                                    updateCmd.Parameters.AddWithValue("@longitude", (object?)lng ?? DBNull.Value);
                                    updateCmd.Parameters.AddWithValue("@price_level", (object?)priceLevel ?? DBNull.Value);
                                    updateCmd.Parameters.AddWithValue("@yelp_id", (object?)bizId ?? DBNull.Value);
                                    await updateCmd.ExecuteNonQueryAsync();
                                }

                                updated++;
                            }

                            // Import hours if business has no hours
                            if (biz.TryGetProperty("hours", out var hoursEl) && hoursEl.ValueKind == System.Text.Json.JsonValueKind.Object)
                            {
                                var hasHoursSql = "SELECT COUNT(*)::int FROM business_hours WHERE business_id = @id;";
                                int existingHours;
                                await using (var hCmd = new NpgsqlCommand(hasHoursSql, conn))
                                {
                                    hCmd.Parameters.AddWithValue("@id", existingId.Value);
                                    existingHours = (int)(await hCmd.ExecuteScalarAsync() ?? 0);
                                }

                                if (existingHours == 0)
                                {
                                    var dayMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                                    {
                                        ["Sunday"] = 0, ["Monday"] = 1, ["Tuesday"] = 2, ["Wednesday"] = 3,
                                        ["Thursday"] = 4, ["Friday"] = 5, ["Saturday"] = 6
                                    };

                                    var daysSeen = new HashSet<int>();

                                    foreach (var prop in hoursEl.EnumerateObject())
                                    {
                                        if (!dayMap.TryGetValue(prop.Name, out var dow)) continue;
                                        var timeRange = prop.Value.GetString();
                                        if (string.IsNullOrWhiteSpace(timeRange)) continue;

                                        daysSeen.Add(dow);
                                        var parts = timeRange.Split('-');
                                        if (parts.Length != 2) continue;

                                        var openStr = NormalizeTime(parts[0]);
                                        var closeStr = NormalizeTime(parts[1]);

                                        bool dayClosed = openStr == "00:00" && closeStr == "00:00";

                                        var ihSql = """
                                            INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
                                            VALUES (@id, @bid, @dow, @open, @close, @closed, @now);
                                            """;

                                        await using var ihCmd = new NpgsqlCommand(ihSql, conn);
                                        ihCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                                        ihCmd.Parameters.AddWithValue("@bid", existingId.Value);
                                        ihCmd.Parameters.AddWithValue("@dow", (short)dow);
                                        ihCmd.Parameters.AddWithValue("@open", dayClosed ? DBNull.Value : (object)TimeOnly.Parse(openStr));
                                        ihCmd.Parameters.AddWithValue("@close", dayClosed ? DBNull.Value : (object)TimeOnly.Parse(closeStr));
                                        ihCmd.Parameters.AddWithValue("@closed", dayClosed);
                                        ihCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                                        await ihCmd.ExecuteNonQueryAsync();
                                    }

                                    // Fill closed days
                                    for (int d = 0; d < 7; d++)
                                    {
                                        if (daysSeen.Contains(d)) continue;
                                        var closedSql = """
                                            INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
                                            VALUES (@id, @bid, @dow, NULL, NULL, TRUE, @now);
                                            """;
                                        await using var cCmd = new NpgsqlCommand(closedSql, conn);
                                        cCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                                        cCmd.Parameters.AddWithValue("@bid", existingId.Value);
                                        cCmd.Parameters.AddWithValue("@dow", (short)d);
                                        cCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                                        await cCmd.ExecuteNonQueryAsync();
                                    }
                                }
                            }
                        }
                        catch
                        {
                            skipped++;
                        }
                    }

                    Console.WriteLine($"Yelp upsert COMPLETE: {updated} updated, {inserted} inserted, {skipped} skipped out of {lineNum}");

                    return Ok(new { updated, inserted, skipped, total = lineNum });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(ImportYelpDatasetUpsert));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpPost("yelp-photos-import")]
        public async Task<IActionResult> ImportYelpPhotos(
            [FromQuery] string photosJsonPath,
            [FromQuery] string photosTarPath,
            [FromQuery] int batchSize = 500)
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

                if (!System.IO.File.Exists(photosJsonPath) || !System.IO.File.Exists(photosTarPath))
                    return BadRequest("Both photosJsonPath and photosTarPath must exist.");

                {
                    var s3 = HttpContext.RequestServices.GetRequiredService<Amazon.S3.IAmazonS3>();
                    var r2Options = _configuration.GetSection("CloudflareR2").Get<CloudflareR2Options>()!;
                    var connStr = _configuration.GetConnectionString("WebApiDatabase");

                    await using var conn = new NpgsqlConnection(connStr);
                    await conn.OpenAsync();

                    // Step 1: Read photos.json and build mapping of business_id -> photo_ids
                    Console.WriteLine("Reading photos.json...");

                    var bizPhotoMap = new Dictionary<string, List<(string photoId, string label)>>();
                    using (var sr = new System.IO.StreamReader(photosJsonPath))
                    {
                        string? line;
                        while ((line = await sr.ReadLineAsync()) != null)
                        {
                            using var doc = System.Text.Json.JsonDocument.Parse(line);
                            var el = doc.RootElement;
                            var photoId = el.GetProperty("photo_id").GetString()!;
                            var bizIdStr = el.GetProperty("business_id").GetString()!;
                            var label = el.TryGetProperty("label", out var labelEl) ? labelEl.GetString() ?? "" : "";

                            if (!bizPhotoMap.ContainsKey(bizIdStr))
                                bizPhotoMap[bizIdStr] = new List<(string, string)>();
                            bizPhotoMap[bizIdStr].Add((photoId, label));
                        }
                    }

                    Console.WriteLine($"Found {bizPhotoMap.Count} businesses with photos in dataset");

                    // Step 2: Find which yelp business IDs exist in our DB
                    var yelpIdToDbId = new Dictionary<string, Guid>();
                    var getIdsSql = "SELECT id, yelp_id FROM businesses WHERE yelp_id IS NOT NULL;";
                    await using (var cmd = new NpgsqlCommand(getIdsSql, conn))
                    {
                        await using var reader = await cmd.ExecuteReaderAsync();
                        while (await reader.ReadAsync())
                        {
                            yelpIdToDbId[reader.GetString(1)] = reader.GetGuid(0);
                        }
                    }

                    Console.WriteLine($"Matched {yelpIdToDbId.Count} businesses in DB with yelp_id");

                    // Step 3: Build set of photo IDs we need to import
                    var neededPhotos = new Dictionary<string, (Guid businessId, string label)>();
                    int matchedBiz = 0, unmatchedBiz = 0;

                    foreach (var (yelpBizId, photos) in bizPhotoMap)
                    {
                        if (!yelpIdToDbId.TryGetValue(yelpBizId, out var dbId))
                        {
                            unmatchedBiz++;
                            continue;
                        }

                        matchedBiz++;
                        foreach (var (photoId, label) in photos.Take(5))
                        {
                            neededPhotos[photoId] = (dbId, label);
                        }
                    }

                    Console.WriteLine($"Matched {matchedBiz} businesses, {unmatchedBiz} unmatched");
                    Console.WriteLine($"Need to import {neededPhotos.Count} photos");

                    // Step 4: Stream through tar and upload matching photos
                    int uploaded = 0, skippedPhotos = 0;

                    // Extract tar to temp directory (handles non-standard tar formats)
                    var extractDir = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "kudos_yelp_photos");
                    if (!System.IO.Directory.Exists(extractDir))
                    {
                        Console.WriteLine($"Extracting tar to {extractDir}...");
                        System.IO.Directory.CreateDirectory(extractDir);
                        var tarProcess = System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = "tar",
                            Arguments = $"xf \"{photosTarPath}\" -C \"{extractDir}\"",
                            UseShellExecute = false,
                            RedirectStandardError = true,
                        });
                        if (tarProcess != null)
                        {
                            await tarProcess.WaitForExitAsync();
                            Console.WriteLine($"Tar extraction complete (exit code: {tarProcess.ExitCode})");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"Using previously extracted photos in {extractDir}");
                    }

                    // Find all jpg files in extracted directory
                    var photoFiles = System.IO.Directory.GetFiles(extractDir, "*.jpg", System.IO.SearchOption.AllDirectories);
                    Console.WriteLine($"Found {photoFiles.Length} jpg files");

                    foreach (var photoFile in photoFiles)
                    {
                        var fileName = System.IO.Path.GetFileNameWithoutExtension(photoFile);
                        if (!neededPhotos.TryGetValue(fileName, out var info))
                        {
                            skippedPhotos++;
                            continue;
                        }

                        try
                        {
                            var key = $"business/{info.businessId}/yelp/{fileName}.jpg";

                            // Skip if already uploaded
                            var existsPhotoSql = "SELECT COUNT(*) FROM business_photos WHERE storage_key = @key;";
                            await using (var epCmd = new NpgsqlCommand(existsPhotoSql, conn))
                            {
                                epCmd.Parameters.AddWithValue("@key", key);
                                var exists = (long)(await epCmd.ExecuteScalarAsync() ?? 0L);
                                if (exists > 0) { skippedPhotos++; continue; }
                            }

                            await s3.PutObjectAsync(new Amazon.S3.Model.PutObjectRequest
                            {
                                BucketName = r2Options.BucketName,
                                Key = key,
                                FilePath = photoFile,
                                ContentType = "image/jpeg",
                                DisablePayloadSigning = true,
                            });

                            var publicUrl = $"{r2Options.PublicBaseUrl}/{key}";
                            var isPrimary = info.label == "outside"; // exterior photos get primary

                            // Check if already has a primary
                            if (isPrimary)
                            {
                                var hasPrimarySql = "SELECT COUNT(*) FROM business_photos WHERE business_id = @bid AND is_primary = TRUE;";
                                await using var hpCmd = new NpgsqlCommand(hasPrimarySql, conn);
                                hpCmd.Parameters.AddWithValue("@bid", info.businessId);
                                var hasPrimary = (long)(await hpCmd.ExecuteScalarAsync() ?? 0L);
                                if (hasPrimary > 0) isPrimary = false;
                            }

                            var insertSql = """
                                INSERT INTO business_photos (id, business_id, storage_key, original_url, content_type, is_primary, created_at_utc)
                                VALUES (@id, @bid, @key, @url, 'image/jpeg', @primary, @now)
                                ON CONFLICT DO NOTHING;
                                """;

                            await using var insertCmd = new NpgsqlCommand(insertSql, conn);
                            insertCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                            insertCmd.Parameters.AddWithValue("@bid", info.businessId);
                            insertCmd.Parameters.AddWithValue("@key", key);
                            insertCmd.Parameters.AddWithValue("@url", publicUrl);
                            insertCmd.Parameters.AddWithValue("@primary", isPrimary);
                            insertCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                            await insertCmd.ExecuteNonQueryAsync();

                            uploaded++;

                            if (uploaded % 100 == 0)
                                Console.WriteLine($"Photos uploaded: {uploaded}/{neededPhotos.Count}");

                            if (uploaded >= batchSize)
                            {
                                Console.WriteLine($"Batch limit reached ({batchSize}). Run again for more.");
                                break;
                            }
                        }
                        catch (Exception ex)
                        {
                        }
                    }

                    Console.WriteLine($"Yelp photos import done: {uploaded} uploaded, {skippedPhotos} skipped");

                    return Ok(new { uploaded, skipped = skippedPhotos, batchSize });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(ImportYelpPhotos));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        private static string NormalizeTime(string raw)
        {
            var parts = raw.Trim().Split(':');
            if (parts.Length != 2) return "00:00";
            return $"{parts[0].PadLeft(2, '0')}:{parts[1].PadLeft(2, '0')}";
        }

        [HttpPost("streetview-backfill")]
        public async Task<IActionResult> BackfillStreetViewPhotos()
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

                var googleApiKey = _configuration["GoogleMaps:ApiKey"];
                if (string.IsNullOrWhiteSpace(googleApiKey))
                    return BadRequest("GoogleMaps:ApiKey not configured.");

                // Find businesses with coordinates but no photos
                var sql = """
                    SELECT b.id, b.latitude, b.longitude
                    FROM businesses b
                    WHERE b.latitude IS NOT NULL
                      AND b.longitude IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM business_photos bp WHERE bp.business_id = b.id
                      )
                    LIMIT 5000;
                    """;

                await using var selectCmd = new NpgsqlCommand(sql, connection);
                await using var reader = await selectCmd.ExecuteReaderAsync();

                var toUpdate = new List<(Guid id, decimal lat, decimal lng)>();
                while (await reader.ReadAsync())
                {
                    toUpdate.Add((reader.GetGuid(0), reader.GetDecimal(1), reader.GetDecimal(2)));
                }
                await reader.CloseAsync();

                int added = 0;
                foreach (var (bizId, lat, lng) in toUpdate)
                {
                    var streetViewUrl = $"https://maps.googleapis.com/maps/api/streetview?size=600x400&location={lat},{lng}&key={googleApiKey}";

                    var insertSql = """
                        INSERT INTO business_photos (id, business_id, original_url, is_primary, created_at_utc)
                        VALUES (@id, @business_id, @url, TRUE, @now);
                        """;

                    try
                    {
                        await using var insertCmd = new NpgsqlCommand(insertSql, connection);
                        insertCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                        insertCmd.Parameters.AddWithValue("@business_id", bizId);
                        insertCmd.Parameters.AddWithValue("@url", streetViewUrl);
                        insertCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                        await insertCmd.ExecuteNonQueryAsync();
                        added++;
                    }
                    catch
                    {
                        // skip duplicates
                    }
                }

                return Ok(new
                {
                    businessesWithoutPhotos = toUpdate.Count,
                    streetViewPhotosAdded = added,
                    estimatedMonthlyCost = $"${Math.Round(added * 0.007m, 2)} if every photo is viewed once"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(BackfillStreetViewPhotos));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetImportStats()
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name;
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var adminSql = "SELECT role FROM users WHERE email = @email LIMIT 1;";
                await using (var ac = new NpgsqlCommand(adminSql, connection)) { ac.Parameters.AddWithValue("@email", email); var r = await ac.ExecuteScalarAsync(); if (r?.ToString() != "admin") return Forbid(); }

                var sql = """
                    SELECT
                        COUNT(*)::int AS total_businesses,
                        COUNT(CASE WHEN yelp_id IS NOT NULL THEN 1 END)::int AS yelp_imported,
                        COUNT(CASE WHEN yelp_id IS NULL THEN 1 END)::int AS user_created
                    FROM businesses;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                await using var reader = await cmd.ExecuteReaderAsync();
                await reader.ReadAsync();

                return Ok(new
                {
                    totalBusinesses = reader.GetInt32(0),
                    yelpImported = reader.GetInt32(1),
                    userCreated = reader.GetInt32(2)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(GetImportStats));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }
        [HttpPost("upload-placeholders")]
        public async Task<IActionResult> UploadPlaceholders()
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value ??
                            User.FindFirst(ClaimTypes.Name)?.Value ??
                            User.Identity?.Name;
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var connStr = _configuration.GetConnectionString("WebApiDatabase");
                await using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync();
                var adminSql = "SELECT role FROM users WHERE email = @email LIMIT 1;";
                await using (var ac = new NpgsqlCommand(adminSql, conn)) { ac.Parameters.AddWithValue("@email", email); var r = await ac.ExecuteScalarAsync(); if (r?.ToString() != "admin") return Forbid(); }

                var s3 = HttpContext.RequestServices.GetRequiredService<Amazon.S3.IAmazonS3>();
                var r2Options = _configuration.GetSection("CloudflareR2").Get<CloudflareR2Options>()!;

                var dir = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "kudos_placeholders");
                if (!System.IO.Directory.Exists(dir))
                    return BadRequest(new { message = $"Placeholder directory not found: {dir}" });

                var files = System.IO.Directory.GetFiles(dir, "*.jpg");
                int uploaded = 0;

                foreach (var file in files)
                {
                    var slug = System.IO.Path.GetFileNameWithoutExtension(file);
                    var key = $"placeholders/{slug}.jpg";

                    await s3.PutObjectAsync(new Amazon.S3.Model.PutObjectRequest
                    {
                        BucketName = r2Options.BucketName,
                        Key = key,
                        FilePath = file,
                        ContentType = "image/jpeg",
                        DisablePayloadSigning = true,
                    });
                    uploaded++;
                }

                return Ok(new { uploaded, baseUrl = $"{r2Options.PublicBaseUrl}/placeholders/" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in {Action}", nameof(UploadPlaceholders));
                return StatusCode(500, new { message = "An unexpected error occurred." });
            }
        }
    }
}
