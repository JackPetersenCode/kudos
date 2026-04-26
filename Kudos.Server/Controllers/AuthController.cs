using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Text;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using BCrypt.Net;
using Kudos.Server.Services;

namespace kudos.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly EmailService _emailService;

        public AuthController(IConfiguration configuration, EmailService emailService)
        {
            _configuration = configuration;
            _emailService = emailService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] AuthRequest request)
        {
            try
            {
                if (!request.AcceptedTerms)
                    return BadRequest("You must accept the Terms of Service and Privacy Policy to create an account.");

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

                // Generate email verification token
                var verificationToken = Guid.NewGuid().ToString("N");
                var setTokenCmd = new NpgsqlCommand(
                    "UPDATE users SET verification_token = @token, verification_token_expires_at = @expires WHERE email = @email",
                    conn
                );
                setTokenCmd.Parameters.AddWithValue("@token", verificationToken);
                setTokenCmd.Parameters.AddWithValue("@expires", DateTime.UtcNow.AddHours(24));
                setTokenCmd.Parameters.AddWithValue("@email", request.Email);
                await setTokenCmd.ExecuteNonQueryAsync();

                var verifyUrl = $"{_configuration["App:FrontendUrl"] ?? "http://localhost:3000"}/verify-email?token={verificationToken}";
                await _emailService.SendVerificationEmail(request.Email, verifyUrl);

                var token = GenerateJwtToken(request.Email, "user");

                return Ok(new
                {
                    token,
                    email = request.Email,
                    role = "user",
                    emailVerified = false,
                    message = "Check your email to verify your account."
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

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
        {
            try
            {
                var connStr = _configuration.GetConnectionString("WebApiDatabase");
                await using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync();

                var sql = """
                    UPDATE users
                    SET email_verified = TRUE, verification_token = NULL, verification_token_expires_at = NULL
                    WHERE verification_token = @token
                      AND verification_token_expires_at > @now;
                    """;

                var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@token", request.Token);
                cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0)
                    return BadRequest("Invalid or expired verification link.");

                return Ok(new { success = true, message = "Email verified successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                var connStr = _configuration.GetConnectionString("WebApiDatabase");
                await using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync();

                var checkCmd = new NpgsqlCommand("SELECT COUNT(*) FROM users WHERE email = @email", conn);
                checkCmd.Parameters.AddWithValue("@email", request.Email);
                var exists = (long)await checkCmd.ExecuteScalarAsync()!;

                if (exists == 0)
                    return Ok(new { message = "If that email exists, a reset link has been sent." });

                var resetToken = Guid.NewGuid().ToString("N");
                var updateCmd = new NpgsqlCommand(
                    "UPDATE users SET reset_token = @token, reset_token_expires_at = @expires WHERE email = @email",
                    conn
                );
                updateCmd.Parameters.AddWithValue("@token", resetToken);
                updateCmd.Parameters.AddWithValue("@expires", DateTime.UtcNow.AddHours(1));
                updateCmd.Parameters.AddWithValue("@email", request.Email);
                await updateCmd.ExecuteNonQueryAsync();

                var resetUrl = $"{_configuration["App:FrontendUrl"] ?? "http://localhost:3000"}/reset-password?token={resetToken}";
                await _emailService.SendPasswordResetEmail(request.Email, resetUrl);

                return Ok(new { message = "If that email exists, a reset link has been sent." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
                    return BadRequest("Password must be at least 6 characters.");

                var connStr = _configuration.GetConnectionString("WebApiDatabase");
                await using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync();

                var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

                var sql = """
                    UPDATE users
                    SET password_hash = @password_hash, reset_token = NULL, reset_token_expires_at = NULL
                    WHERE reset_token = @token
                      AND reset_token_expires_at > @now;
                    """;

                var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@password_hash", passwordHash);
                cmd.Parameters.AddWithValue("@token", request.Token);
                cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0)
                    return BadRequest("Invalid or expired reset link.");

                return Ok(new { success = true, message = "Password reset successfully." });
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
        public bool AcceptedTerms { get; set; }
    }

    public class VerifyEmailRequest
    {
        public string Token { get; set; } = "";
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = "";
    }

    public class ResetPasswordRequest
    {
        public string Token { get; set; } = "";
        public string Password { get; set; } = "";
    }
}