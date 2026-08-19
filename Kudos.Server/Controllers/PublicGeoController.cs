using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/public/geoip")]
    public class PublicGeoController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<PublicGeoController> _logger;

        public PublicGeoController(IHttpClientFactory httpClientFactory, ILogger<PublicGeoController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        private static IActionResult Empty() =>
            new OkObjectResult(new { lat = (double?)null, lng = (double?)null, city = (string?)null, state = (string?)null });

        // Approximate the caller's location from their IP so search can fall back to
        // "near you" even when the browser withholds geolocation — mirroring Yelp,
        // which resolves a city from IP (e.g. "Austin, TX") in incognito. Uses
        // ip-api.com (free, no key). Always returns 200 (nulls on failure) so the
        // client can treat it as best-effort.
        [HttpGet]
        public async Task<IActionResult> GeoIp()
        {
            try
            {
                var ip = Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim();
                if (string.IsNullOrWhiteSpace(ip))
                    ip = HttpContext.Connection.RemoteIpAddress?.ToString();

                // Loopback / private ranges have no useful geo (e.g. local dev).
                if (string.IsNullOrWhiteSpace(ip) || ip.StartsWith("127.") || ip.StartsWith("::1")
                    || ip.StartsWith("10.") || ip.StartsWith("192.168.") || ip.StartsWith("172."))
                    return Empty();

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(3);
                using var resp = await client.GetAsync(
                    $"http://ip-api.com/json/{Uri.EscapeDataString(ip)}?fields=status,lat,lon,city,region");
                if (!resp.IsSuccessStatusCode)
                    return Empty();

                await using var stream = await resp.Content.ReadAsStreamAsync();
                using var doc = await JsonDocument.ParseAsync(stream);
                var root = doc.RootElement;

                if (!root.TryGetProperty("status", out var st) || st.GetString() != "success")
                    return Empty();

                double? lat = root.TryGetProperty("lat", out var la) && la.ValueKind == JsonValueKind.Number ? la.GetDouble() : null;
                double? lng = root.TryGetProperty("lon", out var lo) && lo.ValueKind == JsonValueKind.Number ? lo.GetDouble() : null;
                string? city = root.TryGetProperty("city", out var ci) ? ci.GetString() : null;
                string? state = root.TryGetProperty("region", out var re) ? re.GetString() : null;

                return new OkObjectResult(new { lat, lng, city, state });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "GeoIp lookup failed");
                return Empty();
            }
        }
    }
}
