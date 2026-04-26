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
    [Route("api/reviews/photos")]
    [Authorize]
    public class ReviewPhotosController : ControllerBase
    {
        private readonly IAmazonS3 _s3;
        private readonly CloudflareR2Options _r2;
        private readonly IConfiguration _configuration;

        public ReviewPhotosController(
            IAmazonS3 s3,
            IOptions<CloudflareR2Options> r2Options,
            IConfiguration configuration)
        {
            _s3 = s3;
            _r2 = r2Options.Value;
            _configuration = configuration;
        }

        [HttpPost("upload-url")]
        public async Task<IActionResult> CreateUploadUrl([FromBody] CreateReviewPhotoUploadRequest request)
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

                await using (var cmd = new NpgsqlCommand(getUserSql, connection))
                {
                    cmd.Parameters.AddWithValue("@email", email);
                    var result = await cmd.ExecuteScalarAsync();

                    if (result == null)
                    {
                        return NotFound("User not found.");
                    }

                    userId = (Guid)result;
                }

                var extension = Path.GetExtension(request.FileName);
                var key = $"users/{userId}/review-photos/{Guid.NewGuid()}{extension}";

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
    }
}