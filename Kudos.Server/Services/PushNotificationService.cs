using System.Text;
using System.Text.Json;
using Npgsql;

namespace Kudos.Server.Services
{
    /// <summary>
    /// Sends push notifications to users via Expo's push notification service.
    /// Looks up all device tokens for a user and posts a batch to https://exp.host/--/api/v2/push/send.
    /// </summary>
    public class PushNotificationService
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly ILogger<PushNotificationService> _logger;

        public PushNotificationService(
            IConfiguration configuration,
            HttpClient httpClient,
            ILogger<PushNotificationService> logger)
        {
            _configuration = configuration;
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task SendToUserAsync(Guid userId, string title, string body, object? data = null)
        {
            try
            {
                var tokens = await GetUserTokensAsync(userId);
                if (tokens.Count == 0) return;
                await SendBatchAsync(tokens, title, body, data);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send push notification to user {UserId}", userId);
            }
        }

        private async Task<List<string>> GetUserTokensAsync(Guid userId)
        {
            var connStr = _configuration.GetConnectionString("WebApiDatabase");
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            var sql = "SELECT token FROM device_tokens WHERE user_id = @user_id;";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@user_id", userId);

            var tokens = new List<string>();
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                tokens.Add(reader.GetString(0));
            }
            return tokens;
        }

        private async Task SendBatchAsync(List<string> tokens, string title, string body, object? data)
        {
            var messages = tokens.Select(t => new
            {
                to = t,
                sound = "default",
                title,
                body,
                data = data ?? new { },
                priority = "high",
            }).ToArray();

            var json = JsonSerializer.Serialize(messages);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("https://exp.host/--/api/v2/push/send", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Expo push API returned {Status}: {Body}", response.StatusCode, responseBody);
                return;
            }

            // Parse response: any DeviceNotRegistered errors mean the token is dead — clean up
            try
            {
                using var doc = JsonDocument.Parse(responseBody);
                if (doc.RootElement.TryGetProperty("data", out var dataEl) && dataEl.ValueKind == JsonValueKind.Array)
                {
                    var deadTokens = new List<string>();
                    int idx = 0;
                    foreach (var ticket in dataEl.EnumerateArray())
                    {
                        if (ticket.TryGetProperty("status", out var statusEl) &&
                            statusEl.GetString() == "error" &&
                            ticket.TryGetProperty("details", out var detailsEl) &&
                            detailsEl.TryGetProperty("error", out var errorEl) &&
                            errorEl.GetString() == "DeviceNotRegistered" &&
                            idx < tokens.Count)
                        {
                            deadTokens.Add(tokens[idx]);
                        }
                        idx++;
                    }

                    if (deadTokens.Count > 0)
                    {
                        await CleanupDeadTokensAsync(deadTokens);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not parse Expo push response");
            }
        }

        private async Task CleanupDeadTokensAsync(List<string> tokens)
        {
            try
            {
                var connStr = _configuration.GetConnectionString("WebApiDatabase");
                await using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync();
                await using var cmd = new NpgsqlCommand("DELETE FROM device_tokens WHERE token = ANY(@tokens);", conn);
                cmd.Parameters.AddWithValue("@tokens", tokens.ToArray());
                await cmd.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to clean up dead push tokens");
            }
        }
    }
}
