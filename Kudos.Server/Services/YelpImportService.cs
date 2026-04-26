using Npgsql;
using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Kudos.Server.Services
{
    public class YelpImportService
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly ILogger<YelpImportService> _logger;

        public YelpImportService(IConfiguration configuration, HttpClient httpClient, ILogger<YelpImportService> logger)
        {
            _configuration = configuration;
            _httpClient = httpClient;
            _logger = logger;
        }

        // Maps Yelp category aliases to Kudos category slugs
        private static readonly Dictionary<string, string> YelpCategoryMap = new(StringComparer.OrdinalIgnoreCase)
        {
            // Food & Drink
            ["restaurants"] = "restaurant",
            ["newamerican"] = "restaurant",
            ["tradamerican"] = "restaurant",
            ["chinese"] = "restaurant",
            ["japanese"] = "restaurant",
            ["thai"] = "restaurant",
            ["vietnamese"] = "restaurant",
            ["korean"] = "restaurant",
            ["indian"] = "restaurant",
            ["mediterranean"] = "restaurant",
            ["french"] = "restaurant",
            ["greek"] = "restaurant",
            ["mideastern"] = "restaurant",
            ["latin"] = "restaurant",
            ["cajun"] = "restaurant",
            ["southern"] = "restaurant",
            ["soulfood"] = "restaurant",
            ["vegan"] = "restaurant",
            ["vegetarian"] = "restaurant",
            ["gluten_free"] = "restaurant",
            ["halal"] = "restaurant",
            ["kosher"] = "restaurant",
            ["burgers"] = "restaurant",
            ["sandwiches"] = "restaurant",
            ["salad"] = "restaurant",
            ["soup"] = "restaurant",
            ["wraps"] = "restaurant",
            ["hotdogs"] = "restaurant",
            ["chicken_wings"] = "restaurant",
            ["noodles"] = "restaurant",
            ["ramen"] = "restaurant",
            ["pho"] = "restaurant",
            ["tacos"] = "restaurant",
            ["buffets"] = "restaurant",
            ["diners"] = "restaurant",
            ["food"] = "restaurant",
            ["coffee"] = "coffee-shop",
            ["coffeeroasteries"] = "coffee-shop",
            ["coffeeshops"] = "coffee-shop",
            ["tea"] = "coffee-shop",
            ["bubbletea"] = "coffee-shop",
            ["bakeries"] = "bakery",
            ["bars"] = "bar",
            ["sportsbars"] = "bar",
            ["cocktailbars"] = "bar",
            ["divebars"] = "bar",
            ["lounges"] = "bar",
            ["pubs"] = "bar",
            ["breweries"] = "brewery",
            ["brewpubs"] = "brewery",
            ["wineries"] = "wine-bar",
            ["wine_bars"] = "wine-bar",
            ["desserts"] = "dessert-shop",
            ["icecream"] = "ice-cream-shop",
            ["gelato"] = "ice-cream-shop",
            ["froyo"] = "ice-cream-shop",
            ["foodtrucks"] = "food-truck",
            ["juicebars"] = "juice-bar",
            ["acaibowls"] = "juice-bar",
            ["smoothies"] = "juice-bar",
            ["delis"] = "deli",
            ["pizza"] = "pizza",
            ["seafood"] = "seafood",
            ["steak"] = "steakhouse",
            ["sushi"] = "sushi",
            ["mexican"] = "mexican",
            ["italian"] = "italian",
            ["bbq"] = "bbq",
            ["breakfast_brunch"] = "breakfast-brunch",
            ["brunch"] = "breakfast-brunch",
            ["pancakes"] = "breakfast-brunch",
            ["waffles"] = "breakfast-brunch",

            // Shopping
            ["fashion"] = "clothing-store",
            ["womenscloth"] = "clothing-store",
            ["menscloth"] = "clothing-store",
            ["childcloth"] = "clothing-store",
            ["sportswear"] = "clothing-store",
            ["shoes"] = "clothing-store",
            ["accessories"] = "clothing-store",
            ["bookstores"] = "bookstore",
            ["giftshops"] = "gift-shop",
            ["cards"] = "gift-shop",
            ["jewelry"] = "jewelry-store",
            ["watches"] = "jewelry-store",
            ["florists"] = "florist",
            ["furniture"] = "furniture-store",
            ["homedecor"] = "home-decor",
            ["electronics"] = "electronics-store",
            ["petstore"] = "pet-store",
            ["toys"] = "toy-store",
            ["thrift_stores"] = "thrift-store",
            ["vintage"] = "thrift-store",
            ["grocery"] = "grocery-store",
            ["farmersmarket"] = "farmers-market-vendor",
            ["shopping"] = "other-shopping",

            // Health & Beauty
            ["hair"] = "salon",
            ["hairsalons"] = "salon",
            ["hairstylists"] = "salon",
            ["barbers"] = "barber-shop",
            ["spas"] = "spa",
            ["dayspa"] = "spa",
            ["massage"] = "massage",
            ["massage_therapy"] = "massage",
            ["nailtechnicians"] = "nail-salon",
            ["nail_salons"] = "nail-salon",
            ["gyms"] = "gym",
            ["fitness"] = "gym",
            ["healthclubs"] = "gym",
            ["yoga"] = "yoga-studio",
            ["pilates"] = "pilates-studio",
            ["personaltrainers"] = "personal-trainer",
            ["skincare"] = "skincare",
            ["tattoo"] = "tattoo-shop",
            ["piercing"] = "tattoo-shop",

            // Home & Auto
            ["autorepair"] = "auto-repair",
            ["auto"] = "auto-repair",
            ["tires"] = "auto-repair",
            ["oilchange"] = "auto-repair",
            ["transmission_repair"] = "auto-repair",
            ["carwash"] = "car-wash",
            ["auto_detailing"] = "detailing",
            ["plumbing"] = "plumber",
            ["electricians"] = "electrician",
            ["hvac"] = "hvac",
            ["heating"] = "hvac",
            ["landscaping"] = "landscaping",
            ["lawnservices"] = "landscaping",
            ["gardeners"] = "landscaping",
            ["home_cleaning"] = "cleaning-service",
            ["handyman"] = "handyman",
            ["roofing"] = "roofing",
            ["movers"] = "moving-company",
            ["pest_control"] = "pest-control",

            // Professional Services
            ["lawyers"] = "law-firm",
            ["bankruptcy"] = "law-firm",
            ["divorce"] = "law-firm",
            ["estateplanning"] = "law-firm",
            ["accountants"] = "accounting",
            ["bookkeepers"] = "accounting",
            ["taxservices"] = "accounting",
            ["insurance"] = "insurance-agency",
            ["realestate"] = "real-estate",
            ["realestateagents"] = "real-estate",
            ["mortgage_brokers"] = "real-estate",
            ["marketing"] = "marketing-agency",
            ["advertising"] = "marketing-agency",
            ["web_design"] = "web-design",
            ["photographers"] = "photography",
            ["videographers"] = "photography",
            ["printingservices"] = "printing",
            ["businessconsulting"] = "consulting",
            ["eventplanning"] = "event-planning",

            // Entertainment & Recreation
            ["movietheaters"] = "movie-theater",
            ["bowling"] = "bowling-alley",
            ["arcades"] = "arcade",
            ["musicvenues"] = "music-venue",
            ["jazzandblues"] = "music-venue",
            ["museums"] = "museum",
            ["artgalleries"] = "art-gallery",
            ["parks"] = "park",
            ["playgrounds"] = "park",
            ["escapegames"] = "escape-room",
            ["mini_golf"] = "mini-golf",
            ["dancestudio"] = "dance-studio",
        };

        public Task<YelpImportResult> ImportBusinesses(string location, int maxPages = 5)
            => ImportBusinesses(location, "", maxPages);

        public async Task<YelpImportResult> ImportBusinesses(string location, string searchTerm, int maxPages = 5)
        {
            var apiKey = _configuration["Yelp:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("Yelp API key not configured. Set Yelp:ApiKey.");

            var connectionString = _configuration.GetConnectionString("WebApiDatabase")
                ?? throw new InvalidOperationException("Missing connection string.");

            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            int imported = 0, skipped = 0, failed = 0;
            int offset = 0;
            const int limit = 50;

            for (int page = 0; page < maxPages; page++)
            {
                var url = $"https://api.yelp.com/v3/businesses/search?location={Uri.EscapeDataString(location)}&limit={limit}&offset={offset}&sort_by=review_count";
                if (!string.IsNullOrWhiteSpace(searchTerm))
                    url += $"&term={Uri.EscapeDataString(searchTerm)}";

                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Add("Authorization", $"Bearer {apiKey}");

                using var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Yelp API returned {StatusCode} at offset {Offset}", response.StatusCode, offset);
                    break;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (!root.TryGetProperty("businesses", out var businesses))
                    break;

                if (businesses.GetArrayLength() == 0)
                    break;

                foreach (var biz in businesses.EnumerateArray())
                {
                    try
                    {
                        var result = await ImportSingleBusiness(connection, biz, apiKey);
                        if (result)
                            imported++;
                        else
                            skipped++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to import business");
                        failed++;
                    }
                }

                var total = root.TryGetProperty("total", out var totalEl) ? totalEl.GetInt32() : 0;
                offset += limit;

                if (offset >= total || offset >= 1000) // Yelp caps at 1000
                    break;

                // Rate limiting
                await Task.Delay(200);
            }

            _logger.LogInformation("Yelp import complete for {Location}: {Imported} imported, {Skipped} skipped, {Failed} failed",
                location, imported, skipped, failed);

            return new YelpImportResult { Imported = imported, Skipped = skipped, Failed = failed };
        }

        private async Task<bool> ImportSingleBusiness(NpgsqlConnection connection, JsonElement biz, string apiKey)
        {
            var name = biz.GetProperty("name").GetString() ?? "";
            var yelpId = biz.GetProperty("id").GetString() ?? "";

            if (string.IsNullOrWhiteSpace(name)) return false;

            var slug = Slugify(name);
            if (string.IsNullOrWhiteSpace(slug)) return false;

            // Check if already imported (by yelp_id or slug match)
            var existsSql = """
                SELECT COUNT(*) FROM businesses WHERE slug = @slug OR yelp_id = @yelp_id;
                """;

            await using (var checkCmd = new NpgsqlCommand(existsSql, connection))
            {
                checkCmd.Parameters.AddWithValue("@slug", slug);
                checkCmd.Parameters.AddWithValue("@yelp_id", yelpId);
                var count = (long)(await checkCmd.ExecuteScalarAsync() ?? 0L);
                if (count > 0) return false; // Already exists
            }

            // Make slug unique
            slug = await GenerateUniqueSlugAsync(connection, slug);

            // Extract data
            string? phone = null;
            if (biz.TryGetProperty("display_phone", out var phoneEl))
                phone = phoneEl.GetString();

            string? url = null;
            if (biz.TryGetProperty("url", out var urlEl))
                url = urlEl.GetString();

            decimal? lat = null, lng = null;
            if (biz.TryGetProperty("coordinates", out var coords))
            {
                if (coords.TryGetProperty("latitude", out var latEl) && latEl.ValueKind == JsonValueKind.Number)
                    lat = latEl.GetDecimal();
                if (coords.TryGetProperty("longitude", out var lngEl) && lngEl.ValueKind == JsonValueKind.Number)
                    lng = lngEl.GetDecimal();
            }

            string? address1 = null, address2 = null, city = null, state = null, postalCode = null;
            if (biz.TryGetProperty("location", out var loc))
            {
                if (loc.TryGetProperty("address1", out var a1)) address1 = a1.GetString();
                if (loc.TryGetProperty("address2", out var a2)) address2 = a2.GetString();
                if (loc.TryGetProperty("city", out var c)) city = c.GetString();
                if (loc.TryGetProperty("state", out var s)) state = s.GetString();
                if (loc.TryGetProperty("zip_code", out var z)) postalCode = z.GetString();
            }

            short? priceLevel = null;
            if (biz.TryGetProperty("price", out var priceEl))
            {
                var priceStr = priceEl.GetString();
                if (!string.IsNullOrEmpty(priceStr))
                    priceLevel = (short)priceStr.Length; // "$" = 1, "$$" = 2, etc.
            }

            string? imageUrl = null;
            if (biz.TryGetProperty("image_url", out var imgEl))
                imageUrl = imgEl.GetString();

            // Insert business
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
                    @id, @name, @slug, @description, @phone, @website_url,
                    @address1, @address2, @city, @state, @postal_code,
                    @latitude, @longitude, @price_level,
                    FALSE, FALSE, FALSE, FALSE, FALSE,
                    'America/Chicago', @yelp_id, @created_at_utc
                );
                """;

            await using (var cmd = new NpgsqlCommand(insertSql, connection))
            {
                cmd.Parameters.AddWithValue("@id", businessId);
                cmd.Parameters.AddWithValue("@name", name);
                cmd.Parameters.AddWithValue("@slug", slug);
                cmd.Parameters.AddWithValue("@description", DBNull.Value);
                cmd.Parameters.AddWithValue("@phone", (object?)phone ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@website_url", (object?)url ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@address1", (object?)address1 ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@address2", (object?)address2 ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@city", (object?)city ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@state", (object?)state ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@postal_code", (object?)postalCode ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@latitude", (object?)lat ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@longitude", (object?)lng ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@price_level", (object?)priceLevel ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@yelp_id", yelpId);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();
            }

            // Import primary photo
            if (!string.IsNullOrWhiteSpace(imageUrl))
            {
                var photoSql = """
                    INSERT INTO business_photos (id, business_id, original_url, is_primary, created_at_utc)
                    VALUES (@id, @business_id, @original_url, TRUE, @created_at_utc);
                    """;

                await using var photoCmd = new NpgsqlCommand(photoSql, connection);
                photoCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                photoCmd.Parameters.AddWithValue("@business_id", businessId);
                photoCmd.Parameters.AddWithValue("@original_url", imageUrl);
                photoCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await photoCmd.ExecuteNonQueryAsync();
            }

            // Map categories
            if (biz.TryGetProperty("categories", out var cats))
            {
                foreach (var cat in cats.EnumerateArray())
                {
                    var alias = cat.TryGetProperty("alias", out var aliasEl) ? aliasEl.GetString() : null;
                    if (string.IsNullOrWhiteSpace(alias)) continue;

                    if (!YelpCategoryMap.TryGetValue(alias, out var kudosSlug)) continue;

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
                    catCmd.Parameters.AddWithValue("@category_slug", kudosSlug);

                    await catCmd.ExecuteNonQueryAsync();
                }
            }

            // Fetch business details for hours (separate API call)
            await FetchAndImportHours(connection, businessId, yelpId, apiKey);

            return true;
        }

        private async Task FetchAndImportHours(NpgsqlConnection connection, Guid businessId, string yelpId, string apiKey)
        {
            try
            {
                // Rate limit: small delay before detail call
                await Task.Delay(150);

                var detailUrl = $"https://api.yelp.com/v3/businesses/{Uri.EscapeDataString(yelpId)}";

                using var request = new HttpRequestMessage(HttpMethod.Get, detailUrl);
                request.Headers.Add("Authorization", $"Bearer {apiKey}");

                using var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogDebug("Could not fetch hours for {YelpId}: {StatusCode}", yelpId, response.StatusCode);
                    return;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (!root.TryGetProperty("hours", out var hoursArray))
                    return;

                if (hoursArray.GetArrayLength() == 0)
                    return;

                var firstHoursBlock = hoursArray[0];
                if (!firstHoursBlock.TryGetProperty("open", out var openArray))
                    return;

                // Yelp hours: each entry has day (0=Mon), start ("0800"), end ("1700")
                // Our DB: day_of_week (0=Sun), open_time (time), close_time (time)
                // Yelp: 0=Mon,1=Tue,...,6=Sun -> Our: 0=Sun,1=Mon,...,6=Sat

                // Group by day and take the first entry per day (some businesses have split hours)
                var daysSeen = new HashSet<int>();

                foreach (var entry in openArray.EnumerateArray())
                {
                    if (!entry.TryGetProperty("day", out var dayEl)) continue;
                    if (!entry.TryGetProperty("start", out var startEl)) continue;
                    if (!entry.TryGetProperty("end", out var endEl)) continue;

                    var yelpDay = dayEl.GetInt32(); // 0=Mon
                    var startStr = startEl.GetString() ?? "";
                    var endStr = endEl.GetString() ?? "";

                    if (startStr.Length < 4 || endStr.Length < 4) continue;

                    // Convert Yelp day (0=Mon) to our day (0=Sun)
                    var ourDay = (yelpDay + 1) % 7;

                    if (daysSeen.Contains(ourDay)) continue;
                    daysSeen.Add(ourDay);

                    var openTime = $"{startStr[..2]}:{startStr[2..]}";
                    var closeTime = $"{endStr[..2]}:{endStr[2..]}";

                    var hoursSql = """
                        INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
                        VALUES (@id, @business_id, @day_of_week, @open_time, @close_time, FALSE, @created_at_utc);
                        """;

                    await using var cmd = new NpgsqlCommand(hoursSql, connection);
                    cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    cmd.Parameters.AddWithValue("@day_of_week", (short)ourDay);
                    cmd.Parameters.AddWithValue("@open_time", TimeOnly.Parse(openTime));
                    cmd.Parameters.AddWithValue("@close_time", TimeOnly.Parse(closeTime));
                    cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await cmd.ExecuteNonQueryAsync();
                }

                // Fill in closed days
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
                _logger.LogWarning(ex, "Failed to import hours for business {BusinessId}", businessId);
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
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory == UnicodeCategory.NonSpacingMark) continue;

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
                if (count == 0) return slug;

                slug = $"{baseSlug}-{counter}";
                counter++;
            }
        }
    }

    public class YelpImportResult
    {
        public int Imported { get; set; }
        public int Skipped { get; set; }
        public int Failed { get; set; }
    }
}
