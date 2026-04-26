using Npgsql;
using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Kudos.Server.Services
{
    /// <summary>
    /// Imports businesses from the Yelp Open Dataset JSON file.
    /// Download from https://www.yelp.com/dataset — extract yelp_academic_dataset_business.json
    /// Place it anywhere and pass the file path to ImportFromFile.
    /// </summary>
    public class YelpDatasetImportService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<YelpDatasetImportService> _logger;

        public YelpDatasetImportService(IConfiguration configuration, ILogger<YelpDatasetImportService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        // Same category map as YelpImportService
        private static readonly Dictionary<string, string> YelpCategoryMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Restaurants"] = "restaurant", ["American (New)"] = "restaurant", ["American (Traditional)"] = "restaurant",
            ["Chinese"] = "restaurant", ["Japanese"] = "restaurant", ["Thai"] = "restaurant",
            ["Vietnamese"] = "restaurant", ["Korean"] = "restaurant", ["Indian"] = "restaurant",
            ["Mediterranean"] = "restaurant", ["French"] = "restaurant", ["Greek"] = "restaurant",
            ["Middle Eastern"] = "restaurant", ["Latin American"] = "restaurant",
            ["Cajun/Creole"] = "restaurant", ["Southern"] = "restaurant", ["Soul Food"] = "restaurant",
            ["Vegan"] = "restaurant", ["Vegetarian"] = "restaurant", ["Burgers"] = "restaurant",
            ["Sandwiches"] = "restaurant", ["Salad"] = "restaurant", ["Hot Dogs"] = "restaurant",
            ["Chicken Wings"] = "restaurant", ["Noodles"] = "restaurant", ["Ramen"] = "restaurant",
            ["Pho"] = "restaurant", ["Buffets"] = "restaurant", ["Diners"] = "restaurant",
            ["Food"] = "restaurant",
            ["Coffee & Tea"] = "coffee-shop", ["Coffee Roasteries"] = "coffee-shop",
            ["Tea Rooms"] = "coffee-shop", ["Bubble Tea"] = "coffee-shop",
            ["Bakeries"] = "bakery",
            ["Bars"] = "bar", ["Sports Bars"] = "bar", ["Cocktail Bars"] = "bar",
            ["Dive Bars"] = "bar", ["Lounges"] = "bar", ["Pubs"] = "bar",
            ["Breweries"] = "brewery", ["Brewpubs"] = "brewery",
            ["Wineries"] = "wine-bar", ["Wine Bars"] = "wine-bar",
            ["Desserts"] = "dessert-shop",
            ["Ice Cream & Frozen Yogurt"] = "ice-cream-shop", ["Gelato"] = "ice-cream-shop",
            ["Food Trucks"] = "food-truck",
            ["Juice Bars & Smoothies"] = "juice-bar", ["Acai Bowls"] = "juice-bar",
            ["Delis"] = "deli",
            ["Pizza"] = "pizza", ["Seafood"] = "seafood", ["Steakhouses"] = "steakhouse",
            ["Sushi Bars"] = "sushi", ["Mexican"] = "mexican", ["Italian"] = "italian",
            ["Barbeque"] = "bbq", ["Breakfast & Brunch"] = "breakfast-brunch",

            ["Fashion"] = "clothing-store", ["Women's Clothing"] = "clothing-store",
            ["Men's Clothing"] = "clothing-store", ["Shoe Stores"] = "clothing-store",
            ["Accessories"] = "clothing-store",
            ["Bookstores"] = "bookstore", ["Gift Shops"] = "gift-shop",
            ["Jewelry"] = "jewelry-store", ["Florists"] = "florist",
            ["Furniture Stores"] = "furniture-store", ["Home Decor"] = "home-decor",
            ["Electronics"] = "electronics-store",
            ["Pet Stores"] = "pet-store", ["Toy Stores"] = "toy-store",
            ["Thrift Stores"] = "thrift-store", ["Vintage & Consignment"] = "thrift-store",
            ["Grocery"] = "grocery-store", ["Farmers Market"] = "farmers-market-vendor",
            ["Shopping"] = "other-shopping",

            ["Hair Salons"] = "salon", ["Hair Stylists"] = "salon",
            ["Barbers"] = "barber-shop",
            ["Day Spas"] = "spa", ["Spas"] = "spa",
            ["Massage"] = "massage", ["Massage Therapy"] = "massage",
            ["Nail Salons"] = "nail-salon",
            ["Gyms"] = "gym", ["Fitness & Instruction"] = "gym",
            ["Yoga"] = "yoga-studio", ["Pilates"] = "pilates-studio",
            ["Trainers"] = "personal-trainer",
            ["Skin Care"] = "skincare", ["Tattoo"] = "tattoo-shop",

            ["Auto Repair"] = "auto-repair", ["Oil Change Stations"] = "auto-repair",
            ["Tires"] = "auto-repair",
            ["Car Wash"] = "car-wash", ["Auto Detailing"] = "detailing",
            ["Plumbing"] = "plumber", ["Electricians"] = "electrician",
            ["Heating & Air Conditioning/HVAC"] = "hvac",
            ["Landscaping"] = "landscaping", ["Lawn Services"] = "landscaping",
            ["Home Cleaning"] = "cleaning-service",
            ["Handyman"] = "handyman", ["Roofing"] = "roofing",
            ["Movers"] = "moving-company", ["Pest Control"] = "pest-control",

            ["Lawyers"] = "law-firm", ["Bankruptcy Law"] = "law-firm",
            ["Accountants"] = "accounting", ["Tax Services"] = "accounting",
            ["Insurance"] = "insurance-agency",
            ["Real Estate"] = "real-estate", ["Real Estate Agents"] = "real-estate",
            ["Marketing"] = "marketing-agency",
            ["Web Design"] = "web-design",
            ["Photographers"] = "photography", ["Videographers"] = "photography",
            ["Printing Services"] = "printing",
            ["Business Consulting"] = "consulting",
            ["Event Planning & Services"] = "event-planning",

            ["Cinema"] = "movie-theater", ["Bowling"] = "bowling-alley",
            ["Arcades"] = "arcade", ["Music Venues"] = "music-venue",
            ["Museums"] = "museum", ["Art Galleries"] = "art-gallery",
            ["Parks"] = "park", ["Escape Games"] = "escape-room",
            ["Mini Golf"] = "mini-golf", ["Dance Studios"] = "dance-studio",
        };

        public async Task<YelpImportResult> ImportFromFile(string filePath, string[]? filterStates = null)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException($"Yelp dataset file not found: {filePath}");

            var connectionString = _configuration.GetConnectionString("WebApiDatabase")
                ?? throw new InvalidOperationException("Missing connection string.");

            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            int imported = 0, skipped = 0, failed = 0, lineNum = 0;

            var filterStateSet = filterStates != null && filterStates.Length > 0
                ? new HashSet<string>(filterStates, StringComparer.OrdinalIgnoreCase)
                : null;

            using var stream = File.OpenRead(filePath);
            using var reader = new StreamReader(stream);

            string? line;
            while ((line = await reader.ReadLineAsync()) != null)
            {
                lineNum++;

                if (lineNum % 1000 == 0)
                    _logger.LogInformation("Processing line {LineNum}... ({Imported} imported, {Skipped} skipped)", lineNum, imported, skipped);

                try
                {
                    using var doc = JsonDocument.Parse(line);
                    var biz = doc.RootElement;

                    // Filter by state if specified
                    if (filterStateSet != null)
                    {
                        var bizState = biz.TryGetProperty("state", out var stateEl) ? stateEl.GetString() : null;
                        if (string.IsNullOrWhiteSpace(bizState) || !filterStateSet.Contains(bizState))
                        {
                            skipped++;
                            continue;
                        }
                    }

                    // Skip closed businesses
                    if (biz.TryGetProperty("is_open", out var isOpenEl) && isOpenEl.GetInt32() == 0)
                    {
                        skipped++;
                        continue;
                    }

                    var result = await ImportDatasetBusiness(connection, biz);
                    if (result)
                        imported++;
                    else
                        skipped++;
                }
                catch (Exception ex)
                {
                    failed++;
                    if (failed <= 10)
                        _logger.LogWarning(ex, "Failed to import line {LineNum}", lineNum);
                }
            }

            _logger.LogInformation("Yelp dataset import complete: {Imported} imported, {Skipped} skipped, {Failed} failed out of {Total} lines",
                imported, skipped, failed, lineNum);

            return new YelpImportResult { Imported = imported, Skipped = skipped, Failed = failed };
        }

        private async Task<bool> ImportDatasetBusiness(NpgsqlConnection connection, JsonElement biz)
        {
            var name = biz.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
            var yelpId = biz.TryGetProperty("business_id", out var idEl) ? idEl.GetString() : null;

            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(yelpId))
                return false;

            var slug = Slugify(name);
            if (string.IsNullOrWhiteSpace(slug)) return false;

            // Dedup check
            var existsSql = "SELECT COUNT(*) FROM businesses WHERE yelp_id = @yelp_id;";
            await using (var checkCmd = new NpgsqlCommand(existsSql, connection))
            {
                checkCmd.Parameters.AddWithValue("@yelp_id", yelpId);
                var count = (long)(await checkCmd.ExecuteScalarAsync() ?? 0L);
                if (count > 0) return false;
            }

            slug = await GenerateUniqueSlugAsync(connection, slug);

            // Extract fields
            var address = biz.TryGetProperty("address", out var addrEl) ? addrEl.GetString() : null;
            var city = biz.TryGetProperty("city", out var cityEl) ? cityEl.GetString() : null;
            var state = biz.TryGetProperty("state", out var stateEl2) ? stateEl2.GetString() : null;
            var postalCode = biz.TryGetProperty("postal_code", out var zipEl) ? zipEl.GetString() : null;

            decimal? lat = null, lng = null;
            if (biz.TryGetProperty("latitude", out var latEl) && latEl.ValueKind == JsonValueKind.Number)
                lat = latEl.GetDecimal();
            if (biz.TryGetProperty("longitude", out var lngEl) && lngEl.ValueKind == JsonValueKind.Number)
                lng = lngEl.GetDecimal();

            short? priceLevel = null;
            if (biz.TryGetProperty("attributes", out var attrs) && attrs.ValueKind == JsonValueKind.Object)
            {
                if (attrs.TryGetProperty("RestaurantsPriceRange2", out var priceEl2))
                {
                    var priceStr = priceEl2.GetString();
                    if (short.TryParse(priceStr, out var pl))
                        priceLevel = pl;
                }
            }

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
                    @id, @name, @slug, NULL, NULL, NULL,
                    @address1, NULL, @city, @state, @postal_code,
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
                cmd.Parameters.AddWithValue("@address1", (object?)address ?? DBNull.Value);
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

            // Map categories (comma-separated string in dataset)
            if (biz.TryGetProperty("categories", out var catsEl))
            {
                var catsStr = catsEl.GetString();
                if (!string.IsNullOrWhiteSpace(catsStr))
                {
                    var catNames = catsStr.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                    foreach (var catName in catNames)
                    {
                        if (!YelpCategoryMap.TryGetValue(catName, out var kudosSlug)) continue;

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
            }

            // Import hours
            if (biz.TryGetProperty("hours", out var hoursEl) && hoursEl.ValueKind == JsonValueKind.Object)
            {
                var dayMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                {
                    ["Sunday"] = 0, ["Monday"] = 1, ["Tuesday"] = 2, ["Wednesday"] = 3,
                    ["Thursday"] = 4, ["Friday"] = 5, ["Saturday"] = 6
                };

                var daysSeen = new HashSet<int>();

                foreach (var prop in hoursEl.EnumerateObject())
                {
                    if (!dayMap.TryGetValue(prop.Name, out var dayOfWeek)) continue;
                    var timeRange = prop.Value.GetString(); // "8:0-17:0" or "0:0-0:0"
                    if (string.IsNullOrWhiteSpace(timeRange)) continue;

                    var parts = timeRange.Split('-');
                    if (parts.Length != 2) continue;

                    var openStr = NormalizeTime(parts[0]);
                    var closeStr = NormalizeTime(parts[1]);

                    if (openStr == "00:00" && closeStr == "00:00")
                    {
                        // Closed or 24 hours — treat as closed
                        daysSeen.Add(dayOfWeek);

                        var closedSql = """
                            INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
                            VALUES (@id, @business_id, @day_of_week, NULL, NULL, TRUE, @created_at_utc);
                            """;
                        await using var closedCmd = new NpgsqlCommand(closedSql, connection);
                        closedCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                        closedCmd.Parameters.AddWithValue("@business_id", businessId);
                        closedCmd.Parameters.AddWithValue("@day_of_week", (short)dayOfWeek);
                        closedCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);
                        await closedCmd.ExecuteNonQueryAsync();
                        continue;
                    }

                    daysSeen.Add(dayOfWeek);

                    var hoursSql = """
                        INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
                        VALUES (@id, @business_id, @day_of_week, @open_time, @close_time, FALSE, @created_at_utc);
                        """;

                    await using var hourCmd = new NpgsqlCommand(hoursSql, connection);
                    hourCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    hourCmd.Parameters.AddWithValue("@business_id", businessId);
                    hourCmd.Parameters.AddWithValue("@day_of_week", (short)dayOfWeek);
                    hourCmd.Parameters.AddWithValue("@open_time", TimeOnly.Parse(openStr));
                    hourCmd.Parameters.AddWithValue("@close_time", TimeOnly.Parse(closeStr));
                    hourCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await hourCmd.ExecuteNonQueryAsync();
                }

                // Fill closed days
                for (int day = 0; day < 7; day++)
                {
                    if (daysSeen.Contains(day)) continue;

                    var missingDaySql = """
                        INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed, created_at_utc)
                        VALUES (@id, @business_id, @day_of_week, NULL, NULL, TRUE, @created_at_utc);
                        """;

                    await using var cmd = new NpgsqlCommand(missingDaySql, connection);
                    cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    cmd.Parameters.AddWithValue("@day_of_week", (short)day);
                    cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await cmd.ExecuteNonQueryAsync();
                }
            }

            return true;
        }

        private static string NormalizeTime(string raw)
        {
            // "8:0" -> "08:00", "17:30" -> "17:30"
            var parts = raw.Trim().Split(':');
            if (parts.Length != 2) return "00:00";

            var h = parts[0].PadLeft(2, '0');
            var m = parts[1].PadLeft(2, '0');
            return $"{h}:{m}";
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
