using Npgsql;
using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Kudos.Server.Services
{
    /// <summary>
    /// Imports businesses from OpenStreetMap via the Overpass API.
    /// Completely free, no API key needed, no rate limits for reasonable usage.
    /// </summary>
    public class OpenStreetMapImportService
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly ILogger<OpenStreetMapImportService> _logger;

        public OpenStreetMapImportService(IConfiguration configuration, HttpClient httpClient, ILogger<OpenStreetMapImportService> logger)
        {
            _configuration = configuration;
            _httpClient = httpClient;
            _logger = logger;
        }

        // Maps OSM amenity/shop tags to Kudos category slugs
        private static readonly Dictionary<string, string> OsmCategoryMap = new(StringComparer.OrdinalIgnoreCase)
        {
            // Food & Drink
            ["restaurant"] = "restaurant", ["fast_food"] = "restaurant", ["food_court"] = "restaurant",
            ["cafe"] = "coffee-shop", ["coffee_shop"] = "coffee-shop",
            ["bakery"] = "bakery",
            ["bar"] = "bar", ["pub"] = "bar", ["nightclub"] = "bar",
            ["biergarten"] = "brewery",
            ["ice_cream"] = "ice-cream-shop",
            ["deli"] = "deli",

            // Shopping
            ["clothes"] = "clothing-store", ["shoes"] = "clothing-store", ["fashion"] = "clothing-store",
            ["books"] = "bookstore",
            ["gift"] = "gift-shop",
            ["jewelry"] = "jewelry-store",
            ["florist"] = "florist",
            ["furniture"] = "furniture-store",
            ["electronics"] = "electronics-store", ["computer"] = "electronics-store", ["mobile_phone"] = "electronics-store",
            ["pet"] = "pet-store",
            ["toys"] = "toy-store",
            ["second_hand"] = "thrift-store", ["charity"] = "thrift-store",
            ["supermarket"] = "grocery-store", ["grocery"] = "grocery-store", ["greengrocer"] = "grocery-store",

            // Health & Beauty
            ["hairdresser"] = "salon", ["beauty"] = "salon",
            ["massage"] = "massage",
            ["gym"] = "gym", ["fitness_centre"] = "gym",
            ["tattoo"] = "tattoo-shop",

            // Home & Auto
            ["car_repair"] = "auto-repair", ["car"] = "auto-repair",
            ["car_wash"] = "car-wash",

            // Professional Services
            ["lawyer"] = "law-firm",
            ["accountant"] = "accounting",
            ["insurance"] = "insurance-agency",
            ["estate_agent"] = "real-estate",

            // Entertainment & Recreation
            ["cinema"] = "movie-theater",
            ["arts_centre"] = "art-gallery",
            ["museum"] = "museum",
        };

        public async Task<YelpImportResult> ImportByCity(string city, string state, string country = "US")
        {
            var connectionString = _configuration.GetConnectionString("WebApiDatabase")
                ?? throw new InvalidOperationException("Missing connection string.");

            // Build Overpass query for all amenities and shops in a city
            var overpassQuery = $"""
                [out:json][timeout:120];
                area["name"="{city}"]["admin_level"~"[5-8]"]["boundary"="administrative"]->.searchArea;
                (
                  node["name"]["amenity"~"restaurant|fast_food|cafe|bar|pub|bakery|ice_cream|nightclub|food_court"](area.searchArea);
                  node["name"]["shop"](area.searchArea);
                  node["name"]["amenity"~"car_repair|car_wash|cinema|gym|hairdresser|dentist|pharmacy|veterinary|lawyer"](area.searchArea);
                );
                out body;
                """;

            _logger.LogInformation("Querying Overpass API for businesses in {City}, {State}", city, state);

            var content = new FormUrlEncodedContent(new[] { new KeyValuePair<string, string>("data", overpassQuery) });

            using var response = await _httpClient.PostAsync("https://overpass-api.de/api/interpreter", content);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync();
                _logger.LogError("Overpass API returned {StatusCode}: {Error}", response.StatusCode, errorText);
                throw new Exception($"Overpass API error: {response.StatusCode}");
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("elements", out var elements))
                return new YelpImportResult();

            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            int imported = 0, skipped = 0, failed = 0;

            foreach (var el in elements.EnumerateArray())
            {
                try
                {
                    var result = await ImportOsmElement(connection, el, state);
                    if (result) imported++;
                    else skipped++;
                }
                catch (Exception ex)
                {
                    failed++;
                    if (failed <= 10)
                        _logger.LogWarning(ex, "Failed to import OSM element");
                }
            }

            _logger.LogInformation("OSM import for {City}, {State}: {Imported} imported, {Skipped} skipped, {Failed} failed",
                city, state, imported, skipped, failed);

            return new YelpImportResult { Imported = imported, Skipped = skipped, Failed = failed };
        }

        private static bool IsValidBusinessName(string name)
        {
            if (name.Length < 3 || name.Length > 120) return false;

            // Reject names that start with $ (price tags like "$1.50 Pizza")
            if (name.StartsWith('$')) return false;

            // Reject names that are mostly numbers/symbols
            int letterCount = name.Count(c => char.IsLetter(c));
            if (letterCount < 2) return false;

            // Reject names with too many special characters
            int specialCount = name.Count(c => !char.IsLetterOrDigit(c) && c != ' ' && c != '\'' && c != '-' && c != '&' && c != '.');
            if (specialCount > 3) return false;

            // Reject obvious non-business entries
            var lower = name.ToLowerInvariant();
            string[] rejectPatterns = [
                "parking", "atm", "toilet", "restroom", "bench", "trash",
                "recycling", "mailbox", "fire hydrant", "bus stop",
                "vending machine", "drinking water", "telephone",
                "post box", "waste basket"
            ];
            foreach (var pattern in rejectPatterns)
            {
                if (lower == pattern) return false;
            }

            return true;
        }

        private async Task<bool> ImportOsmElement(NpgsqlConnection connection, JsonElement el, string state)
        {
            if (!el.TryGetProperty("tags", out var tags) || tags.ValueKind != JsonValueKind.Object)
                return false;

            var name = tags.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
            if (string.IsNullOrWhiteSpace(name)) return false;

            if (!IsValidBusinessName(name)) return false;

            var osmId = el.TryGetProperty("id", out var idEl) ? idEl.GetInt64().ToString() : null;
            if (string.IsNullOrWhiteSpace(osmId)) return false;

            var osmUniqueId = $"osm-{osmId}";

            var slug = Slugify(name);
            if (string.IsNullOrWhiteSpace(slug)) return false;

            // Dedup by yelp_id OR by name+city match
            var dedupCity = tags.TryGetProperty("addr:city", out var cityCheckEl) ? cityCheckEl.GetString() : null;

            var existsSql = """
                SELECT COUNT(*) FROM businesses
                WHERE yelp_id = @yelp_id
                   OR (LOWER(TRIM(name)) = LOWER(TRIM(@name)) AND LOWER(COALESCE(city, '')) = LOWER(COALESCE(@dedup_city, '')));
                """;
            await using (var checkCmd = new NpgsqlCommand(existsSql, connection))
            {
                checkCmd.Parameters.AddWithValue("@yelp_id", osmUniqueId);
                checkCmd.Parameters.AddWithValue("@name", name);
                checkCmd.Parameters.AddWithValue("@dedup_city", (object?)dedupCity ?? DBNull.Value);
                var count = (long)(await checkCmd.ExecuteScalarAsync() ?? 0L);
                if (count > 0) return false;
            }

            slug = await GenerateUniqueSlugAsync(connection, slug);

            decimal? lat = null, lng = null;
            if (el.TryGetProperty("lat", out var latEl) && latEl.ValueKind == JsonValueKind.Number)
                lat = latEl.GetDecimal();
            if (el.TryGetProperty("lon", out var lonEl) && lonEl.ValueKind == JsonValueKind.Number)
                lng = lonEl.GetDecimal();

            var phone = tags.TryGetProperty("phone", out var phoneEl) ? phoneEl.GetString() : null;
            var website = tags.TryGetProperty("website", out var webEl) ? webEl.GetString() : null;
            var street = tags.TryGetProperty("addr:street", out var streetEl) ? streetEl.GetString() : null;
            var houseNumber = tags.TryGetProperty("addr:housenumber", out var hnEl) ? hnEl.GetString() : null;
            var city = tags.TryGetProperty("addr:city", out var cityEl) ? cityEl.GetString() : null;
            var postcode = tags.TryGetProperty("addr:postcode", out var pcEl) ? pcEl.GetString() : null;

            var address1 = string.IsNullOrWhiteSpace(houseNumber) ? street : $"{houseNumber} {street}";

            // Determine category
            string? kudosCategory = null;
            var amenity = tags.TryGetProperty("amenity", out var amenityEl) ? amenityEl.GetString() : null;
            var shop = tags.TryGetProperty("shop", out var shopEl) ? shopEl.GetString() : null;

            if (amenity != null && OsmCategoryMap.TryGetValue(amenity, out var catFromAmenity))
                kudosCategory = catFromAmenity;
            else if (shop != null && OsmCategoryMap.TryGetValue(shop, out var catFromShop))
                kudosCategory = catFromShop;

            var businessId = Guid.NewGuid();
            var insertSql = """
                INSERT INTO businesses (
                    id, name, slug, description, phone, website_url,
                    address1, address2, city, state, postal_code,
                    latitude, longitude, price_level,
                    accepts_reservations, offers_online_waitlist,
                    offers_delivery, offers_takeout, outdoor_seating,
                    time_zone, yelp_id, created_at_utc
                ) VALUES (
                    @id, @name, @slug, NULL, @phone, @website_url,
                    @address1, NULL, @city, @state, @postal_code,
                    @latitude, @longitude, NULL,
                    FALSE, FALSE, FALSE, FALSE, FALSE,
                    'America/Chicago', @yelp_id, @created_at_utc
                );
                """;

            await using (var cmd = new NpgsqlCommand(insertSql, connection))
            {
                cmd.Parameters.AddWithValue("@id", businessId);
                cmd.Parameters.AddWithValue("@name", name);
                cmd.Parameters.AddWithValue("@slug", slug);
                cmd.Parameters.AddWithValue("@phone", (object?)phone ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@website_url", (object?)website ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@address1", (object?)address1?.Trim() ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@city", (object?)city ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@state", (object?)state ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@postal_code", (object?)postcode ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@latitude", (object?)lat ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@longitude", (object?)lng ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@yelp_id", osmUniqueId);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();
            }

            // Map category
            if (!string.IsNullOrWhiteSpace(kudosCategory))
            {
                var catSql = """
                    INSERT INTO business_categories (id, business_id, category_id)
                    SELECT @id, @business_id, c.id
                    FROM categories c
                    WHERE c.slug = @category_slug
                    ON CONFLICT (business_id, category_id) DO NOTHING;
                    """;

                await using var catCmd = new NpgsqlCommand(catSql, connection);
                catCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                catCmd.Parameters.AddWithValue("@business_id", businessId);
                catCmd.Parameters.AddWithValue("@category_slug", kudosCategory);

                await catCmd.ExecuteNonQueryAsync();
            }

            // Import hours from opening_hours tag
            var openingHours = tags.TryGetProperty("opening_hours", out var ohEl) ? ohEl.GetString() : null;
            if (!string.IsNullOrWhiteSpace(openingHours))
            {
                await ImportOsmHours(connection, businessId, openingHours);
            }

            return true;
        }

        private async Task ImportOsmHours(NpgsqlConnection connection, Guid businessId, string openingHours)
        {
            // OSM opening_hours format examples:
            // "Mo-Fr 08:00-17:00; Sa 09:00-13:00"
            // "Mo-Su 00:00-24:00" (24/7)
            // "Mo-Fr 08:00-12:00,13:00-17:00" (split hours - take first range)

            var dayMap = new Dictionary<string, int[]>(StringComparer.OrdinalIgnoreCase)
            {
                ["Mo"] = [1], ["Tu"] = [2], ["We"] = [3], ["Th"] = [4],
                ["Fr"] = [5], ["Sa"] = [6], ["Su"] = [0],
                ["Mo-Fr"] = [1, 2, 3, 4, 5],
                ["Mo-Sa"] = [1, 2, 3, 4, 5, 6],
                ["Mo-Su"] = [0, 1, 2, 3, 4, 5, 6],
                ["Sa-Su"] = [0, 6],
                ["Mo-Th"] = [1, 2, 3, 4],
                ["Tu-Sa"] = [2, 3, 4, 5, 6],
                ["Tu-Fr"] = [2, 3, 4, 5],
                ["We-Fr"] = [3, 4, 5],
                ["Th-Sa"] = [4, 5, 6],
            };

            var daysSeen = new HashSet<int>();

            try
            {
                // Split by semicolons for separate rules
                var rules = openingHours.Split(';', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

                foreach (var rule in rules)
                {
                    // Split "Mo-Fr 08:00-17:00" into day part and time part
                    var spaceIdx = rule.IndexOf(' ');
                    if (spaceIdx <= 0) continue;

                    var dayPart = rule[..spaceIdx].Trim();
                    var timePart = rule[(spaceIdx + 1)..].Trim();

                    // Handle comma-separated times (take first range)
                    if (timePart.Contains(','))
                        timePart = timePart.Split(',')[0].Trim();

                    var timeParts = timePart.Split('-');
                    if (timeParts.Length != 2) continue;

                    var openTime = timeParts[0].Trim();
                    var closeTime = timeParts[1].Trim();

                    if (closeTime == "24:00") closeTime = "23:59";

                    if (!TimeOnly.TryParse(openTime, out var open) || !TimeOnly.TryParse(closeTime, out var close))
                        continue;

                    // Handle comma-separated days like "Mo,We,Fr"
                    var daySegments = dayPart.Split(',', StringSplitOptions.TrimEntries);

                    foreach (var daySegment in daySegments)
                    {
                        if (!dayMap.TryGetValue(daySegment, out var days)) continue;

                        foreach (var day in days)
                        {
                            if (daysSeen.Contains(day)) continue;
                            daysSeen.Add(day);

                            var hoursSql = """
                                INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
                                VALUES (@id, @business_id, @day_of_week, @open_time, @close_time, FALSE, @created_at_utc);
                                """;

                            await using var cmd = new NpgsqlCommand(hoursSql, connection);
                            cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                            cmd.Parameters.AddWithValue("@business_id", businessId);
                            cmd.Parameters.AddWithValue("@day_of_week", (short)day);
                            cmd.Parameters.AddWithValue("@open_time", open);
                            cmd.Parameters.AddWithValue("@close_time", close);
                            cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                            await cmd.ExecuteNonQueryAsync();
                        }
                    }
                }

                // Fill closed days
                for (int day = 0; day < 7; day++)
                {
                    if (daysSeen.Contains(day)) continue;

                    var closedSql = """
                        INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
                        VALUES (@id, @business_id, @day_of_week, NULL, NULL, TRUE, @created_at_utc);
                        """;

                    await using var cmd = new NpgsqlCommand(closedSql, connection);
                    cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    cmd.Parameters.AddWithValue("@day_of_week", (short)day);
                    cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await cmd.ExecuteNonQueryAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Could not parse opening_hours: {Hours}", openingHours);
            }
        }

        private static string Slugify(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "";
            var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            var previousDash = false;
            foreach (var c in normalized)
            {
                var uc = CharUnicodeInfo.GetUnicodeCategory(c);
                if (uc == UnicodeCategory.NonSpacingMark) continue;
                if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9'))
                { sb.Append(c); previousDash = false; }
                else if (!previousDash)
                { sb.Append('-'); previousDash = true; }
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
                if (count == 0) return slug;
                slug = $"{baseSlug}-{counter}";
                counter++;
            }
        }
    }
}
