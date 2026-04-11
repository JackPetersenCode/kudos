using Kudos.Server.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Security.Claims;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/public/business")]
    public class PublicBusinessController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public PublicBusinessController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet("{slug}")]
        public async Task<IActionResult> GetBusinessBySlug(string slug)
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

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
                        b.latitude,
                        b.longitude,
                        b.price_level,
                        b.accepts_reservations,
                        b.offers_online_waitlist,
                        b.offers_delivery,
                        b.offers_takeout,
                        b.outdoor_seating,
                        b.time_zone,
                        b.created_at_utc,
                        EXISTS (
                            SELECT 1
                            FROM business_hours bh
                            WHERE bh.business_id = b.id
                              AND bh.is_closed = FALSE
                              AND (
                                    (
                                        bh.day_of_week = EXTRACT(DOW FROM timezone(b.time_zone, now()))::int
                                        AND (
                                            (bh.close_time > bh.open_time
                                                AND timezone(b.time_zone, now())::time >= bh.open_time
                                                AND timezone(b.time_zone, now())::time < bh.close_time)
                                            OR
                                            (bh.close_time <= bh.open_time
                                                AND timezone(b.time_zone, now())::time >= bh.open_time)
                                        )
                                    )
                                    OR
                                    (
                                        bh.day_of_week = ((EXTRACT(DOW FROM timezone(b.time_zone, now()))::int + 6) % 7)
                                        AND bh.close_time <= bh.open_time
                                        AND timezone(b.time_zone, now())::time < bh.close_time
                                    )
                                )
                        ) AS is_open_now
                    FROM businesses b
                    WHERE b.slug = @slug
                    LIMIT 1;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@slug", slug);

                await using var reader = await cmd.ExecuteReaderAsync();

                if (!await reader.ReadAsync())
                {
                    return NotFound("Business not found.");
                }

                var result = new
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
                    latitude = reader.IsDBNull(11) ? null : (decimal?)reader.GetDecimal(11),
                    longitude = reader.IsDBNull(12) ? null : (decimal?)reader.GetDecimal(12),
                    priceLevel = reader.IsDBNull(13) ? null : (short?)reader.GetInt16(13),
                    acceptsReservations = reader.GetBoolean(14),
                    offersOnlineWaitlist = reader.GetBoolean(15),
                    offersDelivery = reader.GetBoolean(16),
                    offersTakeout = reader.GetBoolean(17),
                    outdoorSeating = reader.GetBoolean(18),
                    timeZone = reader.GetString(19),
                    createdAtUtc = reader.GetDateTime(20),
                    isOpenNow = reader.GetBoolean(21)
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new
                {
                    message = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        [HttpGet("{businessId:guid}/hours")]
        public async Task<IActionResult> GetBusinessHours(Guid businessId)
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        day_of_week,
                        open_time,
                        close_time,
                        is_closed
                    FROM business_hours
                    WHERE business_id = @business_id
                    ORDER BY day_of_week;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@business_id", businessId);

                await using var reader = await cmd.ExecuteReaderAsync();

                var hours = new List<object>();

                while (await reader.ReadAsync())
                {
                    hours.Add(new
                    {
                        dayOfWeek = reader.GetInt16(0),
                        openTime = reader.IsDBNull(1) ? null : reader.GetTimeSpan(1).ToString(@"hh\:mm"),
                        closeTime = reader.IsDBNull(2) ? null : reader.GetTimeSpan(2).ToString(@"hh\:mm"),
                        isClosed = reader.GetBoolean(3)
                    });
                }

                return Ok(hours);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new
                {
                    message = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        [HttpGet("{businessId:guid}/photos")]
        public async Task<IActionResult> GetBusinessPhotos(Guid businessId)
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

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
                return StatusCode(500, new
                {
                    message = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        [HttpGet("{businessId:guid}/reviews")]
        public async Task<IActionResult> GetBusinessReviews(Guid businessId)
        {
            try
            {
                var currentEmail =
                    User.FindFirst(ClaimTypes.Email)?.Value ??
                    User.FindFirst(ClaimTypes.Name)?.Value ??
                    User.Identity?.Name;

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new InvalidOperationException("Missing connection string: WebApiDatabase");
                }

                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                var summarySql = """
                    SELECT
                        COUNT(*)::int AS review_count,
                        COALESCE(AVG(rating), 0)::numeric(10,2) AS average_rating
                    FROM reviews
                    WHERE business_id = @business_id;
                    """;

                int reviewCount;
                decimal averageRating;

                await using (var summaryCmd = new NpgsqlCommand(summarySql, connection))
                {
                    summaryCmd.Parameters.AddWithValue("@business_id", businessId);

                    await using var summaryReader = await summaryCmd.ExecuteReaderAsync();
                    await summaryReader.ReadAsync();

                    reviewCount = summaryReader.GetInt32(0);
                    averageRating = summaryReader.GetDecimal(1);
                }

                var reviewsSql = """
                    SELECT
                        r.id,
                        r.rating,
                        r.title,
                        r.body,
                        r.created_at_utc,
                        u.email
                    FROM reviews r
                    INNER JOIN users u
                        ON u.id = r.user_id
                    WHERE r.business_id = @business_id
                    ORDER BY r.created_at_utc DESC;
                    """;

                await using var cmd = new NpgsqlCommand(reviewsSql, connection);
                cmd.Parameters.AddWithValue("@business_id", businessId);

                await using var reader = await cmd.ExecuteReaderAsync();

                var reviews = new List<object>();

                while (await reader.ReadAsync())
                {
                    var userEmail = reader.GetString(5);

                    reviews.Add(new
                    {
                        id = reader.GetGuid(0),
                        rating = reader.GetInt16(1),
                        title = reader.IsDBNull(2) ? null : reader.GetString(2),
                        body = reader.IsDBNull(3) ? null : reader.GetString(3),
                        createdAtUtc = reader.GetDateTime(4),
                        userEmail,
                        isOwnReview = !string.IsNullOrWhiteSpace(currentEmail) &&
                                      string.Equals(currentEmail, userEmail, StringComparison.OrdinalIgnoreCase)
                    });
                }

                return Ok(new
                {
                    reviewCount,
                    averageRating,
                    reviews
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new
                {
                    message = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        [HttpPost("{businessId:guid}/reviews")]
        [Authorize]
        public async Task<IActionResult> CreateReview(Guid businessId, [FromBody] CreateReviewRequest request)
        {
            try
            {
                if (request.Rating < 1 || request.Rating > 5)
                {
                    return BadRequest("Rating must be between 1 and 5.");
                }

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

                Guid userId;

                var getUserSql = """
                    SELECT id
                    FROM users
                    WHERE email = @email
                    LIMIT 1;
                    """;

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

                var insertSql = """
                    INSERT INTO reviews (
                        id,
                        business_id,
                        user_id,
                        rating,
                        title,
                        body,
                        created_at_utc
                    )
                    VALUES (
                        @id,
                        @business_id,
                        @user_id,
                        @rating,
                        @title,
                        @body,
                        @created_at_utc
                    );
                    """;

                await using var cmd = new NpgsqlCommand(insertSql, connection);
                cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@user_id", userId);
                cmd.Parameters.AddWithValue("@rating", (short)request.Rating);
                cmd.Parameters.AddWithValue("@title", (object?)request.Title ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@body", (object?)request.Body ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new
                {
                    businessId,
                    rating = request.Rating,
                    title = request.Title,
                    body = request.Body
                });
            }
            catch (PostgresException ex) when (ex.SqlState == "23505")
            {
                return BadRequest("You have already reviewed this business.");
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new
                {
                    message = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        [HttpPut("{businessId:guid}/reviews/{reviewId:guid}")]
        [Authorize]
        public async Task<IActionResult> UpdateReview(Guid businessId, Guid reviewId, [FromBody] CreateReviewRequest request)
        {
            try
            {
                if (request.Rating < 1 || request.Rating > 5)
                {
                    return BadRequest("Rating must be between 1 and 5.");
                }

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

                Guid userId;

                var getUserSql = """
                    SELECT id
                    FROM users
                    WHERE email = @email
                    LIMIT 1;
                    """;

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

                var sql = """
                    UPDATE reviews
                    SET
                        rating = @rating,
                        title = @title,
                        body = @body
                    WHERE id = @review_id
                      AND business_id = @business_id
                      AND user_id = @user_id;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@rating", (short)request.Rating);
                cmd.Parameters.AddWithValue("@title", (object?)request.Title ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@body", (object?)request.Body ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@review_id", reviewId);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@user_id", userId);

                var rows = await cmd.ExecuteNonQueryAsync();

                if (rows == 0)
                {
                    return NotFound("Review not found or you do not own it.");
                }

                return Ok(new
                {
                    reviewId,
                    businessId,
                    rating = request.Rating,
                    title = request.Title,
                    body = request.Body
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new
                {
                    message = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        [HttpDelete("{businessId:guid}/reviews/{reviewId:guid}")]
        [Authorize]
        public async Task<IActionResult> DeleteReview(Guid businessId, Guid reviewId)
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

                Guid userId;

                var getUserSql = """
                    SELECT id
                    FROM users
                    WHERE email = @email
                    LIMIT 1;
                    """;

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

                var sql = """
                    DELETE FROM reviews
                    WHERE id = @review_id
                      AND business_id = @business_id
                      AND user_id = @user_id;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@review_id", reviewId);
                cmd.Parameters.AddWithValue("@business_id", businessId);
                cmd.Parameters.AddWithValue("@user_id", userId);

                var rows = await cmd.ExecuteNonQueryAsync();

                if (rows == 0)
                {
                    return NotFound("Review not found or you do not own it.");
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new
                {
                    message = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }
    }
}