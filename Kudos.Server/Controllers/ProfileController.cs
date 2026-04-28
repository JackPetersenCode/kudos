using System.Security.Claims;
using Kudos.Server.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace kudos.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfileController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public ProfileController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        try
        {
            var email =
                User.FindFirst(ClaimTypes.Email)?.Value ??
                User.FindFirst(ClaimTypes.Name)?.Value ??
                User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email))
            {
                return Unauthorized("Email claim not found in token.");
            }

            var connectionString = _configuration.GetConnectionString("WebApiDatabase");

            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            var sql = """
                SELECT id, email, role, created_at_utc, display_name
                FROM users
                WHERE email = @email
                LIMIT 1;
                """;

            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@email", email);

            await using var reader = await cmd.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return NotFound("User not found.");
            }

            var userId = reader.GetGuid(0);
            var userEmail = reader.GetString(1);
            var role = reader.GetString(2);
            var createdAtUtc = reader.GetDateTime(3);
            var displayName = reader.IsDBNull(4) ? null : reader.GetString(4);

            return Ok(new
            {
                userId,
                email = userEmail,
                role,
                createdAtUtc,
                displayName
            });
        }
        catch (Exception ex)
        {

            return StatusCode(500, new
            {
                message = ex.Message,
                
            });
        }
    }

    [HttpPut("display-name")]
    [Authorize]
    public async Task<IActionResult> UpdateDisplayName([FromBody] UpdateDisplayNameRequest request)
    {
        try
        {
            var email =
                User.FindFirst(ClaimTypes.Email)?.Value ??
                User.FindFirst(ClaimTypes.Name)?.Value ??
                User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email))
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(request.DisplayName) || request.DisplayName.Trim().Length < 2)
                return BadRequest("Display name must be at least 2 characters.");

            var connectionString = _configuration.GetConnectionString("WebApiDatabase");
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            var sql = "UPDATE users SET display_name = @display_name WHERE email = @email;";
            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@display_name", request.DisplayName.Trim());
            cmd.Parameters.AddWithValue("@email", email);
            await cmd.ExecuteNonQueryAsync();

            return Ok(new { displayName = request.DisplayName.Trim() });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("public/{userId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicProfile(Guid userId)
    {
        try
        {
            var connectionString = _configuration.GetConnectionString("WebApiDatabase");
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            var sql = """
                SELECT u.id, u.display_name, u.email, u.created_at_utc,
                       (SELECT COUNT(*)::int FROM reviews WHERE user_id = u.id) AS review_count,
                       (SELECT COUNT(*)::int FROM check_ins WHERE user_id = u.id) AS checkin_count
                FROM users u
                WHERE u.id = @user_id
                LIMIT 1;
                """;

            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@user_id", userId);

            string email;
            string displayName;
            DateTime joinedAtUtc;
            int reviewCount;
            int checkinCount;

            await using (var reader = await cmd.ExecuteReaderAsync())
            {
                if (!await reader.ReadAsync())
                    return NotFound("User not found.");

                email = reader.GetString(2);
                displayName = reader.IsDBNull(1) ? email.Split('@')[0] : reader.GetString(1);
                joinedAtUtc = reader.GetDateTime(3);
                reviewCount = reader.GetInt32(4);
                checkinCount = reader.GetInt32(5);
            }

            var badgesSql = "SELECT badge_key, badge_label, awarded_at_utc FROM user_badges WHERE user_id = @user_id ORDER BY awarded_at_utc DESC;";
            var badges = new List<object>();
            await using (var badgeCmd = new NpgsqlCommand(badgesSql, connection))
            {
                badgeCmd.Parameters.AddWithValue("@user_id", userId);
                await using var badgeReader = await badgeCmd.ExecuteReaderAsync();
                while (await badgeReader.ReadAsync())
                {
                    badges.Add(new
                    {
                        badgeKey = badgeReader.GetString(0),
                        badgeLabel = badgeReader.GetString(1),
                        awardedAtUtc = badgeReader.GetDateTime(2)
                    });
                }
            }

            // Recent reviews
            var reviewsSql = """
                SELECT r.id, r.rating, r.title, r.body, r.created_at_utc, b.name, b.slug
                FROM reviews r
                INNER JOIN businesses b ON b.id = r.business_id
                WHERE r.user_id = @user_id
                ORDER BY r.created_at_utc DESC
                LIMIT 10;
                """;

            var reviews = new List<object>();
            await using (var revCmd = new NpgsqlCommand(reviewsSql, connection))
            {
                revCmd.Parameters.AddWithValue("@user_id", userId);
                await using var revReader = await revCmd.ExecuteReaderAsync();
                while (await revReader.ReadAsync())
                {
                    reviews.Add(new
                    {
                        id = revReader.GetGuid(0),
                        rating = revReader.GetInt16(1),
                        title = revReader.IsDBNull(2) ? null : revReader.GetString(2),
                        body = revReader.IsDBNull(3) ? null : revReader.GetString(3),
                        createdAtUtc = revReader.GetDateTime(4),
                        businessName = revReader.GetString(5),
                        businessSlug = revReader.GetString(6)
                    });
                }
            }

            return Ok(new
            {
                userId,
                displayName,
                joinedAtUtc,
                reviewCount,
                checkinCount,
                badges,
                recentReviews = reviews
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("business")]
    [Authorize]
    public async Task<IActionResult> GetAccessibleBusinesses()
    {
        try
        {
            var email =
                User.FindFirst(ClaimTypes.Email)?.Value ??
                User.FindFirst(ClaimTypes.Name)?.Value ??
                User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email))
            {
                return Unauthorized("Email claim not found in token.");
            }

            var connectionString = _configuration.GetConnectionString("WebApiDatabase");

            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            var sql = """
                SELECT
                    b.id,
                    b.name,
                    b.slug,
                    b.description,
                    b.phone,
                    b.website_url,
                    b.address1,
                    b.address2,
                    b.city,
                    b.state,
                    b.postal_code,
                    b.created_at_utc,
                    bm.membership_role
                FROM users u
                INNER JOIN business_memberships bm
                    ON bm.user_id = u.id
                INNER JOIN businesses b
                    ON b.id = bm.business_id
                WHERE u.email = @email
                ORDER BY b.name;
                """;

            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@email", email);

            await using var reader = await cmd.ExecuteReaderAsync();

            var businesses = new List<object>();

            while (await reader.ReadAsync())
            {
                businesses.Add(new
                {
                    id = reader.GetGuid(0),
                    name = reader.GetString(1),
                    slug = reader.GetString(2),
                    description = reader.IsDBNull(3) ? null : reader.GetString(3),
                    phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                    websiteUrl = reader.IsDBNull(5) ? null : reader.GetString(5),
                    address1 = reader.IsDBNull(6) ? null : reader.GetString(6),
                    address2 = reader.IsDBNull(7) ? null : reader.GetString(7),
                    city = reader.IsDBNull(8) ? null : reader.GetString(8),
                    state = reader.IsDBNull(9) ? null : reader.GetString(9),
                    postalCode = reader.IsDBNull(10) ? null : reader.GetString(10),
                    createdAtUtc = reader.GetDateTime(11),
                    membershipRole = reader.GetString(12)
                });
            }

            return Ok(businesses);
        }
        catch (Exception ex)
        {
        
            return StatusCode(500, new
            {
                message = ex.Message,
                
            });
        }
    }
}