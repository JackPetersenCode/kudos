using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/public/geoip")]
    public class PublicGeoController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PublicGeoController> _logger;

        // Cache resolved IP -> location across requests to minimize provider calls
        // (combined with the client's per-session cache, keeps us well inside the
        // ipinfo.io free tier). Process-local; fine for this use.
        private static readonly ConcurrentDictionary<string, (DateTimeOffset Expires, GeoResult Result)> _cache = new();
        private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(12);

        public PublicGeoController(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<PublicGeoController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        private record GeoResult(double? lat, double? lng, string? city, string? state);

        private static readonly GeoResult EmptyResult = new(null, null, null, null);

        // Approximate the caller's location from their IP so search can fall back to
        // "near you" even when the browser withholds geolocation — mirroring Yelp.
        // Uses ipinfo.io (50k/mo free) when GeoIp:IpInfoToken is set; otherwise falls
        // back to ip-api.com (free, no key). Always returns 200 (nulls on failure).
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
                    return Ok(EmptyResult);

                if (_cache.TryGetValue(ip, out var cached) && cached.Expires > DateTimeOffset.UtcNow)
                    return Ok(cached.Result);

                var result = await ResolveAsync(ip);

                _cache[ip] = (DateTimeOffset.UtcNow.Add(CacheTtl), result);
                if (_cache.Count > 50_000)
                {
                    foreach (var kv in _cache)
                        if (kv.Value.Expires <= DateTimeOffset.UtcNow)
                            _cache.TryRemove(kv.Key, out _);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "GeoIp lookup failed");
                return Ok(EmptyResult);
            }
        }

        private async Task<GeoResult> ResolveAsync(string ip)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(3);

            var token = _configuration["GeoIp:IpInfoToken"];
            if (!string.IsNullOrWhiteSpace(token))
            {
                try
                {
                    using var resp = await client.GetAsync(
                        $"https://ipinfo.io/{Uri.EscapeDataString(ip)}/json?token={Uri.EscapeDataString(token)}");
                    if (resp.IsSuccessStatusCode)
                    {
                        await using var stream = await resp.Content.ReadAsStreamAsync();
                        using var doc = await JsonDocument.ParseAsync(stream);
                        var root = doc.RootElement;

                        double? lat = null, lng = null;
                        // ipinfo returns loc as "lat,lng"
                        if (root.TryGetProperty("loc", out var locEl) && locEl.GetString() is string loc)
                        {
                            var parts = loc.Split(',');
                            if (parts.Length == 2
                                && double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var la)
                                && double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var lo))
                            {
                                lat = la;
                                lng = lo;
                            }
                        }
                        string? city = root.TryGetProperty("city", out var ci) ? ci.GetString() : null;
                        string? state = root.TryGetProperty("region", out var re) ? re.GetString() : null;

                        if (lat.HasValue && lng.HasValue)
                            return new GeoResult(lat, lng, city, state);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "ipinfo.io lookup failed; falling back");
                }
            }

            // Fallback: ip-api.com (free, no key).
            try
            {
                using var resp = await client.GetAsync(
                    $"http://ip-api.com/json/{Uri.EscapeDataString(ip)}?fields=status,lat,lon,city,region");
                if (resp.IsSuccessStatusCode)
                {
                    await using var stream = await resp.Content.ReadAsStreamAsync();
                    using var doc = await JsonDocument.ParseAsync(stream);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("status", out var st) && st.GetString() == "success")
                    {
                        double? lat = root.TryGetProperty("lat", out var la) && la.ValueKind == JsonValueKind.Number ? la.GetDouble() : null;
                        double? lng = root.TryGetProperty("lon", out var lo) && lo.ValueKind == JsonValueKind.Number ? lo.GetDouble() : null;
                        string? city = root.TryGetProperty("city", out var ci) ? ci.GetString() : null;
                        string? state = root.TryGetProperty("region", out var re) ? re.GetString() : null;
                        return new GeoResult(lat, lng, city, state);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ip-api.com lookup failed");
            }

            return EmptyResult;
        }
    }
}
