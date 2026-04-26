using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Npgsql;
using System.Security.Claims;
using Kudos.Server.Data;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/profile/photo")]
    public class UserPhotosController : ControllerBase
    {
        private readonly IAmazonS3 _s3;
        private readonly CloudflareR2Options _r2;
        private readonly IConfiguration _configuration;

        public UserPhotosController(
            IAmazonS3 s3,
            IOptions<CloudflareR2Options> r2Options,
            IConfiguration configuration)
        {
            _s3 = s3;
            _r2 = r2Options.Value;
            _configuration = configuration;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetProfilePhoto()
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
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        up.id,
                        up.original_url,
                        up.is_primary,
                        up.created_at_utc
                    FROM users u
                    INNER JOIN user_photos up
                        ON up.user_id = u.id
                    WHERE u.email = @email
                    ORDER BY up.is_primary DESC, up.created_at_utc DESC
                    LIMIT 1;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@email", email);

                await using var reader = await cmd.ExecuteReaderAsync();

                if (!await reader.ReadAsync())
                {
                    return Ok(null);
                }

                return Ok(new
                {
                    id = reader.GetGuid(0),
                    originalUrl = reader.GetString(1),
                    isPrimary = reader.GetBoolean(2),
                    createdAtUtc = reader.GetDateTime(3)
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

        [HttpPost("upload-url")]
        [Authorize]
        public async Task<IActionResult> CreateUploadUrl([FromBody] CreateUserPhotoUploadRequest request)
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
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var getUserSql = """
                    SELECT id
                    FROM users
                    WHERE email = @email
                    LIMIT 1;
                    """;

                Guid userId;

                await using (var getUserCmd = new NpgsqlCommand(getUserSql, connection))
                {
                    getUserCmd.Parameters.AddWithValue("@email", email);

                    var result = await getUserCmd.ExecuteScalarAsync();
                    if (result == null)
                    {
                        return NotFound("User not found.");
                    }

                    userId = (Guid)result;
                }

                var extension = Path.GetExtension(request.FileName);
                var key = $"users/{userId}/profile/{Guid.NewGuid()}{extension}";

                var presignedRequest = new GetPreSignedUrlRequest
                {
                    BucketName = _r2.BucketName,
                    Key = key,
                    Verb = HttpVerb.PUT,
                    Expires = DateTime.UtcNow.AddMinutes(10),
                    ContentType = request.ContentType
                };

                var uploadUrl = _s3.GetPreSignedURL(presignedRequest);

                return Ok(new
                {
                    uploadUrl,
                    storageKey = key,
                    publicUrl = $"{_r2.PublicBaseUrl}/{key}"
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

        [HttpPost("complete")]
        [Authorize]
        public async Task<IActionResult> CompleteUpload([FromBody] CompleteUserPhotoUploadRequest request)
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
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var getUserSql = """
                    SELECT id
                    FROM users
                    WHERE email = @email
                    LIMIT 1;
                    """;

                Guid userId;

                await using (var getUserCmd = new NpgsqlCommand(getUserSql, connection))
                {
                    getUserCmd.Parameters.AddWithValue("@email", email);

                    var result = await getUserCmd.ExecuteScalarAsync();
                    if (result == null)
                    {
                        return NotFound("User not found.");
                    }

                    userId = (Guid)result;
                }

                var resetPrimarySql = """
                    UPDATE user_photos
                    SET is_primary = FALSE
                    WHERE user_id = @user_id;
                    """;

                await using (var resetCmd = new NpgsqlCommand(resetPrimarySql, connection))
                {
                    resetCmd.Parameters.AddWithValue("@user_id", userId);
                    await resetCmd.ExecuteNonQueryAsync();
                }

                var photoId = Guid.NewGuid();

                var insertSql = """
                    INSERT INTO user_photos (
                        id,
                        user_id,
                        storage_key,
                        original_url,
                        content_type,
                        size_bytes,
                        is_primary,
                        created_at_utc
                    )
                    VALUES (
                        @id,
                        @user_id,
                        @storage_key,
                        @original_url,
                        @content_type,
                        @size_bytes,
                        @is_primary,
                        @created_at_utc
                    );
                    """;

                await using var cmd = new NpgsqlCommand(insertSql, connection);
                cmd.Parameters.AddWithValue("@id", photoId);
                cmd.Parameters.AddWithValue("@user_id", userId);
                cmd.Parameters.AddWithValue("@storage_key", request.StorageKey);
                cmd.Parameters.AddWithValue("@original_url", request.OriginalUrl);
                cmd.Parameters.AddWithValue("@content_type", (object?)request.ContentType ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@size_bytes", (object?)request.SizeBytes ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@is_primary", true);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new
                {
                    photoId,
                    originalUrl = request.OriginalUrl
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
    }
}