namespace Kudos.Server.Services
{
    public class YelpImportBackgroundJob : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<YelpImportBackgroundJob> _logger;

        public YelpImportBackgroundJob(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<YelpImportBackgroundJob> logger)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
            _logger = logger;
        }

        // Search terms to rotate through daily for broader coverage
        private static readonly string[] SearchTerms =
        [
            "", // general search
            "restaurant", "coffee", "bar", "bakery", "pizza", "sushi", "mexican",
            "salon", "barber", "spa", "gym", "yoga",
            "auto repair", "car wash", "plumber", "electrician",
            "lawyer", "accountant", "real estate",
            "clothing", "bookstore", "florist", "grocery",
            "dentist", "doctor", "veterinary",
        ];

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var locations = _configuration.GetSection("Yelp:ImportLocations").Get<string[]>();
            var apiKey = _configuration["Yelp:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Yelp:ApiKey not configured. Daily import disabled.");
                return;
            }

            if (locations == null || locations.Length == 0)
            {
                _logger.LogWarning("Yelp:ImportLocations not configured. Daily import disabled.");
                return;
            }

            // Wait 30 seconds after startup before first run
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

            var termIndex = 0;

            while (!stoppingToken.IsCancellationRequested)
            {
                // Pick a search term to rotate through (different term each day for broader coverage)
                var searchTerm = SearchTerms[termIndex % SearchTerms.Length];
                termIndex++;

                _logger.LogInformation("Starting daily Yelp import for {Count} locations, term: \"{Term}\"",
                    locations.Length, searchTerm);

                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var importService = scope.ServiceProvider.GetRequiredService<YelpImportService>();

                    foreach (var location in locations)
                    {
                        if (stoppingToken.IsCancellationRequested) break;

                        try
                        {
                            _logger.LogInformation("Importing businesses for: {Location} (term: \"{Term}\")", location, searchTerm);
                            // Use fewer pages per run to stay within daily limit (500 calls)
                            // 4 pages = 200 businesses = ~200 detail calls + 4 search calls = ~204 calls per location
                            var result = await importService.ImportBusinesses(location, searchTerm, maxPages: 4);
                            _logger.LogInformation(
                                "Yelp import for {Location}: {Imported} imported, {Skipped} skipped, {Failed} failed",
                                location, result.Imported, result.Skipped, result.Failed);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to import from Yelp for location: {Location}", location);
                        }

                        // Pause between locations to respect rate limits
                        await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Daily Yelp import job failed");
                }

                // Wait 24 hours before next run
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
        }
    }
}
