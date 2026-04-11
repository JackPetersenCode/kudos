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
    [Route("api/businesses/{businessId:guid}/photos")]
    public class BusinessPhotosController : ControllerBase
    {
        private readonly IAmazonS3 _s3;
        private readonly CloudflareR2Options _r2;
        private readonly IConfiguration _configuration;

        public BusinessPhotosController(
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
        public async Task<IActionResult> GetPhotos(Guid businessId)
        {
            try
            {
                var email = GetCurrentEmail();
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

                if (!await UserHasBusinessAccess(connection, email, businessId))
                {
                    return Forbid();
                }

                var sql = """
                    SELECT
                        id,
                        original_url,
                        is_primary,
                        created_at_utc
                    FROM business_photos
                    WHERE business_id = @business_id
                    ORDER BY is_primary DESC, created_at_utc DESC;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@business_id", businessId);

                await using var reader = await cmd.ExecuteReaderAsync();

                var photos = new List<object>();

                while (await reader.ReadAsync())
                {
                    photos.Add(new
                    {
                        id = reader.GetGuid(0),
                        originalUrl = reader.GetString(1),
                        isPrimary = reader.GetBoolean(2),
                        createdAtUtc = reader.GetDateTime(3)
                    });
                }

                return Ok(photos);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new { message = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPost("upload-url")]
        [Authorize]
        public async Task<IActionResult> CreateUploadUrl(Guid businessId, [FromBody] CreatePhotoUploadRequest request)
        {
            try
            {
                var email = GetCurrentEmail();
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

                if (!await UserHasBusinessAccess(connection, email, businessId))
                {
                    return Forbid();
                }

                var extension = Path.GetExtension(request.FileName);
                var key = $"businesses/{businessId}/photos/{Guid.NewGuid()}{extension}";

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
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new { message = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPost("complete")]
        [Authorize]
        public async Task<IActionResult> CompleteUpload(Guid businessId, [FromBody] CompletePhotoUploadRequest request)
        {
            try
            {
                var email = GetCurrentEmail();
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

                if (!await UserHasBusinessAccess(connection, email, businessId))
                {
                    return Forbid();
                }

                if (request.IsPrimary)
                {
                    var resetPrimarySql = """
                        UPDATE business_photos
                        SET is_primary = FALSE
                        WHERE business_id = @business_id;
                        """;

                    await using var resetCmd = new NpgsqlCommand(resetPrimarySql, connection);
                    resetCmd.Parameters.AddWithValue("@business_id", businessId);
                    await resetCmd.ExecuteNonQueryAsync();
                }

                var insertSql = """
                    INSERT INTO business_photos (
                        id,
                        business_id,
                        storage_key,
                        original_url,
                        content_type,
                        size_bytes,
                        is_primary,
                        created_at_utc
                    )
                    VALUES (
                        @id,
                        @business_id,
                        @storage_key,
                        @original_url,
                        @content_type,
                        @size_bytes,
                        @is_primary,
                        @created_at_utc
                    );
                    """;

                var photoId = Guid.NewGuid();

                await using var cmd = new NpgsqlCommand(insertSql, connection);
                cmd.Parameters.AddWithValue("@id", photoId);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@storage_key", request.StorageKey);
                cmd.Parameters.AddWithValue("@original_url", request.OriginalUrl);
                cmd.Parameters.AddWithValue("@content_type", (object?)request.ContentType ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@size_bytes", (object?)request.SizeBytes ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@is_primary", request.IsPrimary);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new
                {
                    photoId,
                    businessId,
                    request.OriginalUrl,
                    request.IsPrimary
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new { message = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpDelete("{photoId:guid}")]
        [Authorize]
        public async Task<IActionResult> DeletePhoto(Guid businessId, Guid photoId)
        {
            try
            {
                var email = GetCurrentEmail();
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

                if (!await UserHasBusinessAccess(connection, email, businessId))
                {
                    return Forbid();
                }

                string storageKey;
                bool isPrimary;

                var getPhotoSql = """
                    SELECT storage_key, is_primary
                    FROM business_photos
                    WHERE id = @photo_id
                      AND business_id = @business_id
                    LIMIT 1;
                    """;

                await using (var getPhotoCmd = new NpgsqlCommand(getPhotoSql, connection))
                {
                    getPhotoCmd.Parameters.AddWithValue("@photo_id", photoId);
                    getPhotoCmd.Parameters.AddWithValue("@business_id", businessId);

                    await using var reader = await getPhotoCmd.ExecuteReaderAsync();

                    if (!await reader.ReadAsync())
                    {
                        return NotFound("Photo not found.");
                    }

                    storageKey = reader.GetString(0);
                    isPrimary = reader.GetBoolean(1);
                }

                await _s3.DeleteObjectAsync(new DeleteObjectRequest
                {
                    BucketName = _r2.BucketName,
                    Key = storageKey
                });

                var deleteSql = """
                    DELETE FROM business_photos
                    WHERE id = @photo_id
                      AND business_id = @business_id;
                    """;

                await using (var deleteCmd = new NpgsqlCommand(deleteSql, connection))
                {
                    deleteCmd.Parameters.AddWithValue("@photo_id", photoId);
                    deleteCmd.Parameters.AddWithValue("@business_id", businessId);
                    await deleteCmd.ExecuteNonQueryAsync();
                }

                if (isPrimary)
                {
                    var promoteNextSql = """
                        UPDATE business_photos
                        SET is_primary = TRUE
                        WHERE id = (
                            SELECT id
                            FROM business_photos
                            WHERE business_id = @business_id
                            ORDER BY created_at_utc DESC
                            LIMIT 1
                        );
                        """;

                    await using var promoteCmd = new NpgsqlCommand(promoteNextSql, connection);
                    promoteCmd.Parameters.AddWithValue("@business_id", businessId);
                    await promoteCmd.ExecuteNonQueryAsync();
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new { message = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        private string? GetCurrentEmail()
        {
            return User.FindFirst(ClaimTypes.Email)?.Value
                ?? User.FindFirst(ClaimTypes.Name)?.Value
                ?? User.Identity?.Name;
        }

        private static async Task<bool> UserHasBusinessAccess(NpgsqlConnection connection, string email, Guid businessId)
        {
            var accessSql = """
                SELECT 1
                FROM users u
                INNER JOIN business_memberships bm
                    ON bm.user_id = u.id
                WHERE u.email = @email
                  AND bm.business_id = @business_id
                LIMIT 1;
                """;

            await using var accessCmd = new NpgsqlCommand(accessSql, connection);
            accessCmd.Parameters.AddWithValue("@email", email);
            accessCmd.Parameters.AddWithValue("@business_id", businessId);

            var hasAccess = await accessCmd.ExecuteScalarAsync();
            return hasAccess != null;
        }
    }
}