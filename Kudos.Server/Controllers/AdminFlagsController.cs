using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Security.Claims;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/admin/flags")]
    [Authorize]
    public class AdminFlagsController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public AdminFlagsController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GetFlags([FromQuery] string status = "pending")
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value
                    ?? User.FindFirst(ClaimTypes.Name)?.Value
                    ?? User.Identity?.Name;
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var adminCheck = new NpgsqlCommand("SELECT role FROM users WHERE email = @email LIMIT 1;", connection);
                adminCheck.Parameters.AddWithValue("@email", email);
                var role = await adminCheck.ExecuteScalarAsync();
                if (role?.ToString() != "admin") return Forbid();

                var sql = """
                    SELECT
                        rf.id,
                        rf.review_id,
                        rf.reason,
                        rf.details,
                        rf.status,
                        rf.created_at_utc,
                        rf.resolution_note,
                        u.email AS flagger_email,
                        r.title AS review_title,
                        r.body AS review_body,
                        ru.email AS reviewer_email,
                        b.name AS business_name,
                        b.slug AS business_slug,
                        (SELECT COUNT(*)::int FROM review_flags rf2 WHERE rf2.review_id = rf.review_id) AS total_flags
                    FROM review_flags rf
                    JOIN users u ON u.id = rf.user_id
                    JOIN reviews r ON r.id = rf.review_id
                    JOIN users ru ON ru.id = r.user_id
                    JOIN businesses b ON b.id = r.business_id
                    WHERE rf.status = @status
                    ORDER BY rf.created_at_utc DESC
                    LIMIT 50;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@status", status);

                await using var reader = await cmd.ExecuteReaderAsync();
                var flags = new List<object>();

                while (await reader.ReadAsync())
                {
                    flags.Add(new
                    {
                        id = reader.GetGuid(0),
                        reviewId = reader.GetGuid(1),
                        reason = reader.GetString(2),
                        details = reader.IsDBNull(3) ? null : reader.GetString(3),
                        status = reader.GetString(4),
                        createdAtUtc = reader.GetDateTime(5),
                        resolutionNote = reader.IsDBNull(6) ? null : reader.GetString(6),
                        flaggerEmail = reader.GetString(7),
                        reviewTitle = reader.IsDBNull(8) ? null : reader.GetString(8),
                        reviewBody = reader.IsDBNull(9) ? null : reader.GetString(9),
                        reviewerEmail = reader.GetString(10),
                        businessName = reader.GetString(11),
                        businessSlug = reader.GetString(12),
                        totalFlags = reader.GetInt32(13),
                    });
                }

                return Ok(flags);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("{flagId:guid}/resolve")]
        public async Task<IActionResult> ResolveFlag(Guid flagId, [FromBody] ResolveFlagRequest request)
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value
                    ?? User.FindFirst(ClaimTypes.Name)?.Value
                    ?? User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var adminCheck = new NpgsqlCommand("SELECT role FROM users WHERE email = @email LIMIT 1;", connection);
                adminCheck.Parameters.AddWithValue("@email", email);
                var role = await adminCheck.ExecuteScalarAsync();
                if (role?.ToString() != "admin") return Forbid();

                Guid userId;
                await using (var getUserCmd = new NpgsqlCommand("SELECT id FROM users WHERE email = @email LIMIT 1;", connection))
                {
                    getUserCmd.Parameters.AddWithValue("@email", email);
                    var result = await getUserCmd.ExecuteScalarAsync();
                    if (result == null) return Unauthorized();
                    userId = (Guid)result;
                }

                if (request.Action == "remove")
                {
                    // Get the review_id from the flag, then delete the review
                    var getReviewIdSql = "SELECT review_id FROM review_flags WHERE id = @flag_id;";
                    Guid? reviewId = null;
                    await using (var getCmd = new NpgsqlCommand(getReviewIdSql, connection))
                    {
                        getCmd.Parameters.AddWithValue("@flag_id", flagId);
                        var result = await getCmd.ExecuteScalarAsync();
                        if (result is Guid rid) reviewId = rid;
                    }

                    if (reviewId != null)
                    {
                        // Resolve all flags for this review
                        var resolveAllSql = """
                            UPDATE review_flags
                            SET status = 'removed', resolved_at_utc = @now, resolved_by_user_id = @admin_id, resolution_note = @note
                            WHERE review_id = @review_id;
                            """;
                        await using (var resolveCmd = new NpgsqlCommand(resolveAllSql, connection))
                        {
                            resolveCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                            resolveCmd.Parameters.AddWithValue("@admin_id", userId);
                            resolveCmd.Parameters.AddWithValue("@note", (object?)request.Note ?? DBNull.Value);
                            resolveCmd.Parameters.AddWithValue("@review_id", reviewId.Value);
                            await resolveCmd.ExecuteNonQueryAsync();
                        }

                        // Delete the review
                        await using (var deleteCmd = new NpgsqlCommand("DELETE FROM reviews WHERE id = @id;", connection))
                        {
                            deleteCmd.Parameters.AddWithValue("@id", reviewId.Value);
                            await deleteCmd.ExecuteNonQueryAsync();
                        }
                    }
                }
                else
                {
                    // Dismiss the flag
                    var sql = """
                        UPDATE review_flags
                        SET status = 'dismissed', resolved_at_utc = @now, resolved_by_user_id = @admin_id, resolution_note = @note
                        WHERE id = @flag_id;
                        """;
                    await using var cmd = new NpgsqlCommand(sql, connection);
                    cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                    cmd.Parameters.AddWithValue("@admin_id", userId);
                    cmd.Parameters.AddWithValue("@note", (object?)request.Note ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@flag_id", flagId);
                    await cmd.ExecuteNonQueryAsync();
                }

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    public class ResolveFlagRequest
    {
        public string Action { get; set; } = "dismiss"; // "dismiss" or "remove"
        public string? Note { get; set; }
    }
}
