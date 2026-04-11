using System.Security.Claims;
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
                SELECT id, email, role, created_at_utc
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

            return Ok(new
            {
                userId,
                email = userEmail,
                role,
                createdAtUtc
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine("===== ERROR =====");
            Console.WriteLine(ex.ToString());
            Console.WriteLine("=================");

            return StatusCode(500, new
            {
                message = ex.Message,
                stackTrace = ex.StackTrace
            });
        }
    }

    [HttpGet("business")]
    [Authorize]
    public async Task<IActionResult> GetAccessibleBusinesses()
    {
        Console.WriteLine("shitholeeeee");
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
            Console.WriteLine("===== ERROR =====");
            Console.WriteLine(ex.ToString());
            Console.WriteLine("=================");
        
            return StatusCode(500, new
            {
                message = ex.Message,
                stackTrace = ex.StackTrace
            });
        }
    }
}