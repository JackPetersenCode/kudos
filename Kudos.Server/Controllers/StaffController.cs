using Kudos.Server.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Security.Claims;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/business/{businessId:guid}/staff")]
    [Authorize]
    public class StaffController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public StaffController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetStaffMembers(Guid businessId)
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        sm.id,
                        sm.first_name,
                        sm.last_name,
                        sm.role,
                        sm.photo_url,
                        sm.is_active,
                        sm.created_at_utc,
                        COUNT(sk.id)::int AS kudos_count
                    FROM staff_members sm
                    LEFT JOIN staff_kudos sk ON sk.staff_member_id = sm.id
                    WHERE sm.business_id = @business_id
                      AND sm.is_active = TRUE
                    GROUP BY sm.id
                    ORDER BY kudos_count DESC, sm.first_name ASC;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@business_id", businessId);

                await using var reader = await cmd.ExecuteReaderAsync();

                var staff = new List<object>();
                var staffIds = new List<Guid>();

                while (await reader.ReadAsync())
                {
                    var id = reader.GetGuid(0);
                    staffIds.Add(id);
                    staff.Add(new
                    {
                        id,
                        firstName = reader.GetString(1),
                        lastName = reader.GetString(2),
                        role = reader.IsDBNull(3) ? null : reader.GetString(3),
                        photoUrl = reader.IsDBNull(4) ? null : reader.GetString(4),
                        isActive = reader.GetBoolean(5),
                        createdAtUtc = reader.GetDateTime(6),
                        kudosCount = reader.GetInt32(7),
                        topTags = new List<object>()
                    });
                }

                await reader.CloseAsync();

                if (staffIds.Count > 0)
                {
                    var tagSql = """
                        SELECT
                            sk.staff_member_id,
                            skt.tag_name,
                            COUNT(*)::int AS count
                        FROM staff_kudos_tags skt
                        INNER JOIN staff_kudos sk ON sk.id = skt.staff_kudos_id
                        WHERE sk.staff_member_id = ANY(@staff_ids)
                        GROUP BY sk.staff_member_id, skt.tag_name
                        ORDER BY count DESC;
                        """;

                    await using var tagCmd = new NpgsqlCommand(tagSql, connection);
                    tagCmd.Parameters.AddWithValue("@staff_ids", staffIds.ToArray());

                    await using var tagReader = await tagCmd.ExecuteReaderAsync();

                    var tagsByStaff = new Dictionary<Guid, List<object>>();

                    while (await tagReader.ReadAsync())
                    {
                        var staffMemberId = tagReader.GetGuid(0);
                        var tagName = tagReader.GetString(1);
                        var count = tagReader.GetInt32(2);

                        if (!tagsByStaff.ContainsKey(staffMemberId))
                        {
                            tagsByStaff[staffMemberId] = new List<object>();
                        }

                        tagsByStaff[staffMemberId].Add(new { tagName, count });
                    }

                    staff = staff.Select(s =>
                    {
                        var sType = s.GetType();
                        var id = (Guid)sType.GetProperty("id")!.GetValue(s)!;
                        var tags = tagsByStaff.TryGetValue(id, out var t) ? t : new List<object>();

                        return new
                        {
                            id,
                            firstName = (string)sType.GetProperty("firstName")!.GetValue(s)!,
                            lastName = (string)sType.GetProperty("lastName")!.GetValue(s)!,
                            role = (string?)sType.GetProperty("role")!.GetValue(s),
                            photoUrl = (string?)sType.GetProperty("photoUrl")!.GetValue(s),
                            isActive = (bool)sType.GetProperty("isActive")!.GetValue(s)!,
                            createdAtUtc = (DateTime)sType.GetProperty("createdAtUtc")!.GetValue(s)!,
                            kudosCount = (int)sType.GetProperty("kudosCount")!.GetValue(s)!,
                            topTags = tags
                        } as object;
                    }).ToList();
                }

                return Ok(staff);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateStaffMember(Guid businessId, [FromBody] CreateStaffMemberRequest request)
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value ??
                            User.FindFirst(ClaimTypes.Name)?.Value ??
                            User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized("Email claim not found in token.");

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var accessSql = """
                    SELECT bm.membership_role
                    FROM users u
                    INNER JOIN business_memberships bm ON bm.user_id = u.id
                    WHERE u.email = @email AND bm.business_id = @business_id
                    LIMIT 1;
                    """;

                await using (var accessCmd = new NpgsqlCommand(accessSql, connection))
                {
                    accessCmd.Parameters.AddWithValue("@email", email);
                    accessCmd.Parameters.AddWithValue("@business_id", businessId);

                    var role = await accessCmd.ExecuteScalarAsync();
                    if (role == null)
                        return Forbid();
                }

                var staffId = Guid.NewGuid();

                var insertSql = """
                    INSERT INTO staff_members (id, business_id, first_name, last_name, role, photo_url, is_active, created_at_utc)
                    VALUES (@id, @business_id, @first_name, @last_name, @role, @photo_url, TRUE, @created_at_utc);
                    """;

                await using var cmd = new NpgsqlCommand(insertSql, connection);
                cmd.Parameters.AddWithValue("@id", staffId);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@first_name", request.FirstName);
                cmd.Parameters.AddWithValue("@last_name", request.LastName);
                cmd.Parameters.AddWithValue("@role", (object?)request.Role ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@photo_url", (object?)request.PhotoUrl ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { id = staffId, businessId, firstName = request.FirstName, lastName = request.LastName });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("{staffId:guid}")]
        public async Task<IActionResult> UpdateStaffMember(Guid businessId, Guid staffId, [FromBody] CreateStaffMemberRequest request)
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value ??
                            User.FindFirst(ClaimTypes.Name)?.Value ??
                            User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized("Email claim not found in token.");

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var accessSql = """
                    SELECT bm.membership_role
                    FROM users u
                    INNER JOIN business_memberships bm ON bm.user_id = u.id
                    WHERE u.email = @email AND bm.business_id = @business_id
                    LIMIT 1;
                    """;

                await using (var accessCmd = new NpgsqlCommand(accessSql, connection))
                {
                    accessCmd.Parameters.AddWithValue("@email", email);
                    accessCmd.Parameters.AddWithValue("@business_id", businessId);

                    var role = await accessCmd.ExecuteScalarAsync();
                    if (role == null)
                        return Forbid();
                }

                var updateSql = """
                    UPDATE staff_members
                    SET first_name = @first_name, last_name = @last_name, role = @role, photo_url = @photo_url
                    WHERE id = @staff_id AND business_id = @business_id;
                    """;

                await using var cmd = new NpgsqlCommand(updateSql, connection);
                cmd.Parameters.AddWithValue("@staff_id", staffId);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@first_name", request.FirstName);
                cmd.Parameters.AddWithValue("@last_name", request.LastName);
                cmd.Parameters.AddWithValue("@role", (object?)request.Role ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@photo_url", (object?)request.PhotoUrl ?? DBNull.Value);

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0)
                    return NotFound("Staff member not found.");

                return Ok(new { staffId, updated = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("{staffId:guid}")]
        public async Task<IActionResult> DeleteStaffMember(Guid businessId, Guid staffId)
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value ??
                            User.FindFirst(ClaimTypes.Name)?.Value ??
                            User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized("Email claim not found in token.");

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var accessSql = """
                    SELECT bm.membership_role
                    FROM users u
                    INNER JOIN business_memberships bm ON bm.user_id = u.id
                    WHERE u.email = @email AND bm.business_id = @business_id
                    LIMIT 1;
                    """;

                await using (var accessCmd = new NpgsqlCommand(accessSql, connection))
                {
                    accessCmd.Parameters.AddWithValue("@email", email);
                    accessCmd.Parameters.AddWithValue("@business_id", businessId);

                    var role = await accessCmd.ExecuteScalarAsync();
                    if (role == null)
                        return Forbid();
                }

                var updateSql = """
                    UPDATE staff_members SET is_active = FALSE WHERE id = @staff_id AND business_id = @business_id;
                    """;

                await using var cmd = new NpgsqlCommand(updateSql, connection);
                cmd.Parameters.AddWithValue("@staff_id", staffId);
                cmd.Parameters.AddWithValue("@business_id", businessId);

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0)
                    return NotFound("Staff member not found.");

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{staffId:guid}/kudos")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStaffKudos(Guid businessId, Guid staffId)
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        sk.id,
                        sk.body,
                        sk.created_at_utc,
                        u.email
                    FROM staff_kudos sk
                    INNER JOIN users u ON u.id = sk.user_id
                    WHERE sk.staff_member_id = @staff_id
                      AND sk.business_id = @business_id
                    ORDER BY sk.created_at_utc DESC;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@staff_id", staffId);
                cmd.Parameters.AddWithValue("@business_id", businessId);

                await using var reader = await cmd.ExecuteReaderAsync();

                var kudos = new List<object>();
                var kudosIds = new List<Guid>();

                while (await reader.ReadAsync())
                {
                    var id = reader.GetGuid(0);
                    kudosIds.Add(id);
                    kudos.Add(new
                    {
                        id,
                        body = reader.IsDBNull(1) ? null : reader.GetString(1),
                        createdAtUtc = reader.GetDateTime(2),
                        userEmail = reader.GetString(3),
                        tags = new List<string>()
                    });
                }

                await reader.CloseAsync();

                if (kudosIds.Count > 0)
                {
                    var tagSql = """
                        SELECT staff_kudos_id, tag_name
                        FROM staff_kudos_tags
                        WHERE staff_kudos_id = ANY(@kudos_ids);
                        """;

                    await using var tagCmd = new NpgsqlCommand(tagSql, connection);
                    tagCmd.Parameters.AddWithValue("@kudos_ids", kudosIds.ToArray());

                    await using var tagReader = await tagCmd.ExecuteReaderAsync();

                    var tagsByKudos = new Dictionary<Guid, List<string>>();
                    while (await tagReader.ReadAsync())
                    {
                        var kudosId = tagReader.GetGuid(0);
                        var tagName = tagReader.GetString(1);
                        if (!tagsByKudos.ContainsKey(kudosId))
                            tagsByKudos[kudosId] = new List<string>();
                        tagsByKudos[kudosId].Add(tagName);
                    }

                    kudos = kudos.Select(k =>
                    {
                        var kType = k.GetType();
                        var id = (Guid)kType.GetProperty("id")!.GetValue(k)!;
                        return new
                        {
                            id,
                            body = (string?)kType.GetProperty("body")!.GetValue(k),
                            createdAtUtc = (DateTime)kType.GetProperty("createdAtUtc")!.GetValue(k)!,
                            userEmail = (string)kType.GetProperty("userEmail")!.GetValue(k)!,
                            tags = tagsByKudos.TryGetValue(id, out var tags) ? tags : new List<string>()
                        } as object;
                    }).ToList();
                }

                return Ok(kudos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("{staffId:guid}/kudos")]
        public async Task<IActionResult> CreateStaffKudos(Guid businessId, Guid staffId, [FromBody] CreateStaffKudosRequest request)
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value ??
                            User.FindFirst(ClaimTypes.Name)?.Value ??
                            User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized("Email claim not found in token.");

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                Guid userId;
                await using (var getUserCmd = new NpgsqlCommand("SELECT id FROM users WHERE email = @email LIMIT 1;", connection))
                {
                    getUserCmd.Parameters.AddWithValue("@email", email);
                    var result = await getUserCmd.ExecuteScalarAsync();
                    if (result == null)
                        return NotFound("User not found.");
                    userId = (Guid)result;
                }

                // Sentiment analysis on the body if provided
                var textToAnalyze = request.Body?.Trim() ?? "";
                if (!string.IsNullOrWhiteSpace(textToAnalyze))
                {
                    // We don't inject OpenAI here to keep it simple - staff kudos are positive-only by tag design
                    // But we could add sentiment check here if needed
                }

                var kudosId = Guid.NewGuid();

                var insertSql = """
                    INSERT INTO staff_kudos (id, staff_member_id, business_id, user_id, body, created_at_utc)
                    VALUES (@id, @staff_member_id, @business_id, @user_id, @body, @created_at_utc);
                    """;

                await using (var cmd = new NpgsqlCommand(insertSql, connection))
                {
                    cmd.Parameters.AddWithValue("@id", kudosId);
                    cmd.Parameters.AddWithValue("@staff_member_id", staffId);
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    cmd.Parameters.AddWithValue("@user_id", userId);
                    cmd.Parameters.AddWithValue("@body", (object?)request.Body ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await cmd.ExecuteNonQueryAsync();
                }

                var allowedTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "friendly", "knowledgeable", "efficient", "professional", "went-above-and-beyond"
                };

                var normalizedTags = (request.Tags ?? new List<string>())
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim().ToLowerInvariant())
                    .Where(x => allowedTags.Contains(x))
                    .Distinct()
                    .ToList();

                foreach (var tag in normalizedTags)
                {
                    var insertTagSql = """
                        INSERT INTO staff_kudos_tags (id, staff_kudos_id, tag_name, created_at_utc)
                        VALUES (@id, @staff_kudos_id, @tag_name, @created_at_utc);
                        """;

                    await using var tagCmd = new NpgsqlCommand(insertTagSql, connection);
                    tagCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    tagCmd.Parameters.AddWithValue("@staff_kudos_id", kudosId);
                    tagCmd.Parameters.AddWithValue("@tag_name", tag);
                    tagCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await tagCmd.ExecuteNonQueryAsync();
                }

                return Ok(new { kudosId, staffMemberId = staffId, tags = normalizedTags });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
