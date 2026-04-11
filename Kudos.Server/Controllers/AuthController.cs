//using Microsoft.AspNetCore.Mvc;
//using Npgsql;
//using System.Text;
//using System.Security.Claims;
//using Microsoft.IdentityModel.Tokens;
//using System.IdentityModel.Tokens.Jwt;
//
//namespace kudos.Controllers
//{
//    [ApiController]
//    [Route("api/[controller]")]
//    public class AuthController : ControllerBase
//    {
//        private readonly IConfiguration _configuration;
//
//        public AuthController(IConfiguration configuration)
//        {
//            _configuration = configuration;
//        }
//
//        // =========================
//        // REGISTER
//        // =========================
//        [HttpPost("register")]
//        public async Task<IActionResult> Register([FromBody] AuthRequest request)
//        {
//            try
//            {
//                var connStr = _configuration.GetConnectionString("WebApiDatabase");
//
//                await using var conn = new NpgsqlConnection(connStr);
//                await conn.OpenAsync();
//                Console.WriteLine("LETS GO");
//                // Check if user exists
//                var checkCmd = new NpgsqlCommand(
//                    "SELECT COUNT(*) FROM users WHERE email = @email",
//                    conn
//                );
//                checkCmd.Parameters.AddWithValue("@email", request.Email);
//
//                var exists = (long)await checkCmd.ExecuteScalarAsync();
//
//                if (exists > 0)
//                {
//                    return BadRequest("User already exists");
//                }
//
//                // Insert user (plain password for now — we can hash later)
//                var insertCmd = new NpgsqlCommand(
//                    "INSERT INTO users (email, password, role) VALUES (@email, @password, 'user')",
//                    conn
//                );
//
//                insertCmd.Parameters.AddWithValue("@email", request.Email);
//                insertCmd.Parameters.AddWithValue("@password", request.Password);
//
//                await insertCmd.ExecuteNonQueryAsync();
//
//                var token = GenerateJwtToken(request.Email, "user");
//
//                return Ok(new
//                {
//                    token,
//                    email = request.Email,
//                    role = "user"
//                });
//            }
//            catch (Exception ex)
//            {
//                return StatusCode(500, ex.Message);
//            }
//        }
//
//        // =========================
//        // LOGIN
//        // =========================
//        [HttpPost("login")]
//        public async Task<IActionResult> Login([FromBody] AuthRequest request)
//        {
//            try
//            {
//                var connStr = _configuration.GetConnectionString("WebApiDatabase");
//
//                await using var conn = new NpgsqlConnection(connStr);
//                await conn.OpenAsync();
//
//                var cmd = new NpgsqlCommand(
//                    "SELECT password, role FROM users WHERE email = @email",
//                    conn
//                );
//
//                cmd.Parameters.AddWithValue("@email", request.Email);
//
//                await using var reader = await cmd.ExecuteReaderAsync();
//
//                if (!await reader.ReadAsync())
//                {
//                    return Unauthorized("Invalid credentials");
//                }
//
//                var dbPassword = reader.GetString(0);
//                var role = reader.GetString(1);
//
//                if (dbPassword != request.Password)
//                {
//                    return Unauthorized("Invalid credentials");
//                }
//
//                var token = GenerateJwtToken(request.Email, role);
//
//                return Ok(new
//                {
//                    token,
//                    email = request.Email,
//                    role
//                });
//            }
//            catch (Exception ex)
//            {
//                return StatusCode(500, ex.Message);
//            }
//        }
//
//        // =========================
//        // JWT GENERATION
//        // =========================
//        private string GenerateJwtToken(string email, string role)
//        {
//            var key = new SymmetricSecurityKey(
//                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"])
//            );
//
//            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
//
//            var claims = new[]
//            {
//                new Claim(ClaimTypes.Name, email),
//                new Claim(ClaimTypes.Role, role)
//            };
//
//            var token = new JwtSecurityToken(
//                issuer: _configuration["Jwt:Issuer"],
//                audience: _configuration["Jwt:Audience"],
//                claims: claims,
//                expires: DateTime.UtcNow.AddDays(7),
//                signingCredentials: creds
//            );
//
//            return new JwtSecurityTokenHandler().WriteToken(token);
//        }
//    }
//
//    // =========================
//    // REQUEST MODEL
//    // =========================
//    public class AuthRequest
//    {
//        public string Email { get; set; }
//        public string Password { get; set; }
//    }
//}

using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Text;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using BCrypt.Net;

namespace kudos.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public AuthController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] AuthRequest request)
        {
            Console.WriteLine(request.Email);
            try
            {
                var connStr = _configuration.GetConnectionString("WebApiDatabase");

                await using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync();

                var checkCmd = new NpgsqlCommand(
                    "SELECT COUNT(*) FROM users WHERE email = @email",
                    conn
                );
                checkCmd.Parameters.AddWithValue("@email", request.Email);

                var exists = (long)await checkCmd.ExecuteScalarAsync();

                if (exists > 0)
                {
                    return BadRequest("User already exists");
                }

                var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

                var insertCmd = new NpgsqlCommand(
                    "INSERT INTO users (email, password_hash, role) VALUES (@email, @password_hash, 'user')",
                    conn
                );

                insertCmd.Parameters.AddWithValue("@email", request.Email);
                insertCmd.Parameters.AddWithValue("@password_hash", passwordHash);

                await insertCmd.ExecuteNonQueryAsync();

                var token = GenerateJwtToken(request.Email, "user");

                return Ok(new
                {
                    token,
                    email = request.Email,
                    role = "user"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AuthRequest request)
        {
            try
            {
                var connStr = _configuration.GetConnectionString("WebApiDatabase");

                await using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync();

                var cmd = new NpgsqlCommand(
                    "SELECT password_hash, role FROM users WHERE email = @email",
                    conn
                );

                cmd.Parameters.AddWithValue("@email", request.Email);

                await using var reader = await cmd.ExecuteReaderAsync();

                if (!await reader.ReadAsync())
                {
                    return Unauthorized("Invalid credentials");
                }

                var dbPasswordHash = reader.GetString(0);
                var role = reader.GetString(1);

                var validPassword = BCrypt.Net.BCrypt.Verify(request.Password, dbPasswordHash);

                if (!validPassword)
                {
                    return Unauthorized("Invalid credentials");
                }

                var token = GenerateJwtToken(request.Email, role);

                return Ok(new
                {
                    token,
                    email = request.Email,
                    role
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        private string GenerateJwtToken(string email, string role)
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"])
            );

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, email),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, role)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class AuthRequest
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
    }
}