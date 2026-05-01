using Amazon.S3;
using Amazon.S3.Model;
using Kudos.Server.Data;
using Kudos.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Npgsql;
using System.Security.Claims;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/public/business")]
    public class PublicBusinessController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly OpenAIService _openAi;
        private readonly PushNotificationService _push;
        private readonly IAmazonS3 _s3;
        private readonly CloudflareR2Options _r2;

        private readonly ILogger<PublicBusinessController> _logger;

        public PublicBusinessController(
            IConfiguration configuration,
            OpenAIService openAi,
            PushNotificationService push,
            IAmazonS3 s3,
            IOptions<CloudflareR2Options> r2Options,
            ILogger<PublicBusinessController> logger)
        {
            _configuration = configuration;
            _openAi = openAi;
            _push = push;
            _s3 = s3;
            _r2 = r2Options.Value;
            _logger = logger;
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
                return StatusCode(500, new
                {
                    message = ex.Message,
                    
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
                return StatusCode(500, new
                {
                    message = ex.Message,
                    
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
                        created_at_utc,
                        uploaded_by_user_id
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
                        createdAtUtc = reader.GetDateTime(3),
                        uploadedByUserId = reader.IsDBNull(4) ? null : reader.GetGuid(4).ToString()
                    });
                }

                return Ok(photos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message,
                    
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

                var tagCountsSql = """
                    SELECT
                        rpt.tag_name,
                        COUNT(*)::int AS count
                    FROM review_positive_tags rpt
                    INNER JOIN reviews r
                        ON r.id = rpt.review_id
                    WHERE r.business_id = @business_id
                    GROUP BY rpt.tag_name;
                    """;

                var tagCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                {
                    ["service"] = 0,
                    ["quality"] = 0,
                    ["cleanliness"] = 0,
                    ["value"] = 0,
                    ["experience"] = 0
                };

                await using (var tagCountsCmd = new NpgsqlCommand(tagCountsSql, connection))
                {
                    tagCountsCmd.Parameters.AddWithValue("@business_id", businessId);

                    await using var tagCountsReader = await tagCountsCmd.ExecuteReaderAsync();

                    while (await tagCountsReader.ReadAsync())
                    {
                        var tagName = tagCountsReader.GetString(0);
                        var count = tagCountsReader.GetInt32(1);
                        tagCounts[tagName] = count;
                    }
                }

                var reviewsSql = """
                    SELECT
                        r.id,
                        r.rating,
                        r.title,
                        r.body,
                        r.created_at_utc,
                        u.email,
                        u.display_name,
                        u.id AS user_id,
                        (SELECT COUNT(*)::int FROM reviews r2 WHERE r2.user_id = u.id) AS user_review_count
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
                var reviewIds = new List<Guid>();

                while (await reader.ReadAsync())
                {
                    var reviewId = reader.GetGuid(0);
                    reviewIds.Add(reviewId);

                    var userEmail = reader.GetString(5);
                    var displayName = reader.IsDBNull(6) ? null : reader.GetString(6);
                    var reviewUserId = reader.GetGuid(7);

                    reviews.Add(new
                    {
                        id = reviewId,
                        rating = reader.GetInt16(1),
                        title = reader.IsDBNull(2) ? null : reader.GetString(2),
                        body = reader.IsDBNull(3) ? null : reader.GetString(3),
                        createdAtUtc = reader.GetDateTime(4),
                        userEmail,
                        displayName = displayName ?? userEmail.Split('@')[0],
                        userId = reviewUserId,
                        userReviewCount = reader.GetInt32(8),
                        positiveTags = new List<string>(),
                        photos = new List<object>(),
                        isOwnReview = !string.IsNullOrWhiteSpace(currentEmail) &&
                                      string.Equals(currentEmail, userEmail, StringComparison.OrdinalIgnoreCase)
                    });
                }

                await reader.CloseAsync();

                var tagsByReviewId = new Dictionary<Guid, List<string>>();

                if (reviewIds.Count > 0)
                {
                    var reviewTagsSql = """
                        SELECT review_id, tag_name
                        FROM review_positive_tags
                        WHERE review_id = ANY(@review_ids);
                        """;

                    await using var reviewTagsCmd = new NpgsqlCommand(reviewTagsSql, connection);
                    reviewTagsCmd.Parameters.AddWithValue("@review_ids", reviewIds.ToArray());

                    await using var reviewTagsReader = await reviewTagsCmd.ExecuteReaderAsync();

                    while (await reviewTagsReader.ReadAsync())
                    {
                        var reviewId = reviewTagsReader.GetGuid(0);
                        var tagName = reviewTagsReader.GetString(1);

                        if (!tagsByReviewId.ContainsKey(reviewId))
                        {
                            tagsByReviewId[reviewId] = new List<string>();
                        }

                        tagsByReviewId[reviewId].Add(tagName);
                    }
                }

                var photosByReviewId = new Dictionary<Guid, List<object>>();

                if (reviewIds.Count > 0)
                {
                    var reviewPhotosSql = """
                        SELECT
                            review_id,
                            id,
                            original_url,
                            created_at_utc
                        FROM review_photos
                        WHERE review_id = ANY(@review_ids)
                        ORDER BY created_at_utc ASC;
                        """;

                    await using var reviewPhotosCmd = new NpgsqlCommand(reviewPhotosSql, connection);
                    reviewPhotosCmd.Parameters.AddWithValue("@review_ids", reviewIds.ToArray());

                    await using var reviewPhotosReader = await reviewPhotosCmd.ExecuteReaderAsync();

                    while (await reviewPhotosReader.ReadAsync())
                    {
                        var reviewId = reviewPhotosReader.GetGuid(0);

                        if (!photosByReviewId.ContainsKey(reviewId))
                        {
                            photosByReviewId[reviewId] = new List<object>();
                        }

                        photosByReviewId[reviewId].Add(new
                        {
                            id = reviewPhotosReader.GetGuid(1),
                            originalUrl = reviewPhotosReader.GetString(2),
                            createdAtUtc = reviewPhotosReader.GetDateTime(3)
                        });
                    }
                }

                // Fetch helpful vote counts
                var helpfulByReviewId = new Dictionary<Guid, int>();
                var userHelpfulVotes = new HashSet<Guid>();

                if (reviewIds.Count > 0)
                {
                    var helpfulSql = """
                        SELECT review_id, COUNT(*)::int AS count
                        FROM review_helpful_votes
                        WHERE review_id = ANY(@review_ids)
                        GROUP BY review_id;
                        """;

                    await using var helpfulCmd = new NpgsqlCommand(helpfulSql, connection);
                    helpfulCmd.Parameters.AddWithValue("@review_ids", reviewIds.ToArray());

                    await using var helpfulReader = await helpfulCmd.ExecuteReaderAsync();
                    while (await helpfulReader.ReadAsync())
                    {
                        helpfulByReviewId[helpfulReader.GetGuid(0)] = helpfulReader.GetInt32(1);
                    }
                    await helpfulReader.CloseAsync();

                    // Check which reviews current user has voted helpful
                    if (!string.IsNullOrWhiteSpace(currentEmail))
                    {
                        var userHelpfulSql = """
                            SELECT rhv.review_id
                            FROM review_helpful_votes rhv
                            INNER JOIN users u ON u.id = rhv.user_id
                            WHERE rhv.review_id = ANY(@review_ids)
                              AND u.email = @email;
                            """;

                        await using var userHelpfulCmd = new NpgsqlCommand(userHelpfulSql, connection);
                        userHelpfulCmd.Parameters.AddWithValue("@review_ids", reviewIds.ToArray());
                        userHelpfulCmd.Parameters.AddWithValue("@email", currentEmail);

                        await using var userHelpfulReader = await userHelpfulCmd.ExecuteReaderAsync();
                        while (await userHelpfulReader.ReadAsync())
                        {
                            userHelpfulVotes.Add(userHelpfulReader.GetGuid(0));
                        }
                    }
                }

                // Fetch business responses
                var responsesByReviewId = new Dictionary<Guid, object>();

                if (reviewIds.Count > 0)
                {
                    var responsesSql = """
                        SELECT review_id, body, created_at_utc
                        FROM review_responses
                        WHERE review_id = ANY(@review_ids);
                        """;

                    await using var responsesCmd = new NpgsqlCommand(responsesSql, connection);
                    responsesCmd.Parameters.AddWithValue("@review_ids", reviewIds.ToArray());

                    await using var responsesReader = await responsesCmd.ExecuteReaderAsync();
                    while (await responsesReader.ReadAsync())
                    {
                        responsesByReviewId[responsesReader.GetGuid(0)] = new
                        {
                            body = responsesReader.GetString(1),
                            createdAtUtc = responsesReader.GetDateTime(2)
                        };
                    }
                }

                // Fetch staff recognitions per review
                var staffRecognitionsByReviewId = new Dictionary<Guid, List<object>>();

                if (reviewIds.Count > 0)
                {
                    var staffKudosSql = """
                        SELECT
                            sk.review_id,
                            sk.staff_member_id,
                            sm.first_name,
                            sm.last_name,
                            sm.photo_url,
                            COALESCE(
                                (SELECT ARRAY_AGG(skt.tag_name) FROM staff_kudos_tags skt WHERE skt.staff_kudos_id = sk.id),
                                ARRAY[]::text[]
                            ) AS tags
                        FROM staff_kudos sk
                        INNER JOIN staff_members sm ON sm.id = sk.staff_member_id
                        WHERE sk.review_id = ANY(@review_ids)
                        ORDER BY sk.created_at_utc;
                        """;

                    await using var skCmd = new NpgsqlCommand(staffKudosSql, connection);
                    skCmd.Parameters.AddWithValue("@review_ids", reviewIds.ToArray());

                    await using var skReader = await skCmd.ExecuteReaderAsync();
                    while (await skReader.ReadAsync())
                    {
                        var revId = skReader.GetGuid(0);
                        if (!staffRecognitionsByReviewId.ContainsKey(revId))
                            staffRecognitionsByReviewId[revId] = new List<object>();

                        staffRecognitionsByReviewId[revId].Add(new
                        {
                            staffMemberId = skReader.GetGuid(1),
                            firstName = skReader.GetString(2),
                            lastName = skReader.GetString(3),
                            photoUrl = skReader.IsDBNull(4) ? null : skReader.GetString(4),
                            tags = skReader.IsDBNull(5) ? Array.Empty<string>() : skReader.GetFieldValue<string[]>(5)
                        });
                    }
                }

                var finalReviews = reviews.Select(r =>
                {
                    var reviewType = r.GetType();
                    var reviewId = (Guid)reviewType.GetProperty("id")!.GetValue(r)!;

                    var isOwn = (bool)reviewType.GetProperty("isOwnReview")!.GetValue(r)!;
                    var emailValue = (string)reviewType.GetProperty("userEmail")!.GetValue(r)!;

                    return new
                    {
                        id = reviewId,
                        rating = (short)reviewType.GetProperty("rating")!.GetValue(r)!,
                        title = (string?)reviewType.GetProperty("title")!.GetValue(r),
                        body = (string?)reviewType.GetProperty("body")!.GetValue(r),
                        createdAtUtc = (DateTime)reviewType.GetProperty("createdAtUtc")!.GetValue(r)!,
                        userEmail = isOwn ? emailValue : null,
                        displayName = (string)reviewType.GetProperty("displayName")!.GetValue(r)!,
                        userId = (Guid)reviewType.GetProperty("userId")!.GetValue(r)!,
                        positiveTags = tagsByReviewId.TryGetValue(reviewId, out var tags)
                            ? tags
                            : new List<string>(),
                        photos = photosByReviewId.TryGetValue(reviewId, out var photos)
                            ? photos
                            : new List<object>(),
                        userReviewCount = (int)reviewType.GetProperty("userReviewCount")!.GetValue(r)!,
                        isOwnReview = isOwn,
                        helpfulCount = helpfulByReviewId.TryGetValue(reviewId, out var hc) ? hc : 0,
                        isMarkedHelpful = userHelpfulVotes.Contains(reviewId),
                        businessResponse = responsesByReviewId.TryGetValue(reviewId, out var resp) ? resp : null,
                        staffRecognitions = staffRecognitionsByReviewId.TryGetValue(reviewId, out var sr) ? sr : new List<object>()
                    };
                });

                return Ok(new
                {
                    reviewCount,
                    averageRating,
                    categoryClicks = new
                    {
                        service = tagCounts["service"],
                        quality = tagCounts["quality"],
                        cleanliness = tagCounts["cleanliness"],
                        value = tagCounts["value"],
                        experience = tagCounts["experience"]
                    },
                    reviews = finalReviews
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
                    await CleanupUploadedReviewPhotosAsync(request.Photos);
                    return Unauthorized("Email claim not found in token.");
                }

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    await CleanupUploadedReviewPhotosAsync(request.Photos);
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
                        await CleanupUploadedReviewPhotosAsync(request.Photos);
                        return NotFound("User not found.");
                    }

                    userId = (Guid)result;
                }

                var textToAnalyze = $"{request.Title} {request.Body}".Trim();

                string? sentiment = null;

                if (!string.IsNullOrWhiteSpace(textToAnalyze))
                {
                    try
                    {
                        sentiment = await _openAi.AnalyzeSentiment(textToAnalyze);
                    }
                    catch (SentimentServiceUnavailableException)
                    {
                        await CleanupUploadedReviewPhotosAsync(request.Photos);

                        return StatusCode(503, new
                        {
                            success = false,
                            reason = "sentiment_unavailable",
                            message = "Review moderation is temporarily unavailable. Please try again later."
                        });
                    }
                }

                if (string.Equals(sentiment, "negative", StringComparison.OrdinalIgnoreCase))
                {
                    await CleanupUploadedReviewPhotosAsync(request.Photos);

                    return BadRequest(new
                    {
                        success = false,
                        reason = "negative_sentiment",
                        message = "Your review appears to be negative and cannot be submitted."
                    });
                }

                var reviewId = Guid.NewGuid();

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

                await using (var cmd = new NpgsqlCommand(insertSql, connection))
                {
                    cmd.Parameters.AddWithValue("@id", reviewId);
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    cmd.Parameters.AddWithValue("@user_id", userId);
                    cmd.Parameters.AddWithValue("@rating", (short)request.Rating);
                    cmd.Parameters.AddWithValue("@title", (object?)request.Title ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@body", (object?)request.Body ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await cmd.ExecuteNonQueryAsync();
                }

                var allowedTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "service",
                    "quality",
                    "cleanliness",
                    "value",
                    "experience"
                };

                var normalizedTags = (request.PositiveTags ?? new List<string>())
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim().ToLowerInvariant())
                    .Where(x => allowedTags.Contains(x))
                    .Distinct()
                    .ToList();

                foreach (var tag in normalizedTags)
                {
                    var insertTagSql = """
                        INSERT INTO review_positive_tags (
                            id,
                            review_id,
                            tag_name,
                            created_at_utc
                        )
                        VALUES (
                            @id,
                            @review_id,
                            @tag_name,
                            @created_at_utc
                        );
                        """;

                    await using var tagCmd = new NpgsqlCommand(insertTagSql, connection);
                    tagCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    tagCmd.Parameters.AddWithValue("@review_id", reviewId);
                    tagCmd.Parameters.AddWithValue("@tag_name", tag);
                    tagCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await tagCmd.ExecuteNonQueryAsync();
                }

                var photos = request.Photos ?? new List<ReviewPhotoInput>();

                if (photos.Count > 5)
                {
                    await CleanupUploadedReviewPhotosAsync(request.Photos);
                    return BadRequest("A review can have at most 5 photos.");
                }

                foreach (var photo in photos)
                {
                    var insertPhotoSql = """
                        INSERT INTO review_photos (
                            id,
                            review_id,
                            storage_key,
                            original_url,
                            content_type,
                            size_bytes,
                            created_at_utc
                        )
                        VALUES (
                            @id,
                            @review_id,
                            @storage_key,
                            @original_url,
                            @content_type,
                            @size_bytes,
                            @created_at_utc
                        );
                        """;

                    await using var photoCmd = new NpgsqlCommand(insertPhotoSql, connection);
                    photoCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    photoCmd.Parameters.AddWithValue("@review_id", reviewId);
                    photoCmd.Parameters.AddWithValue("@storage_key", photo.StorageKey);
                    photoCmd.Parameters.AddWithValue("@original_url", photo.OriginalUrl);
                    photoCmd.Parameters.AddWithValue("@content_type", (object?)photo.ContentType ?? DBNull.Value);
                    photoCmd.Parameters.AddWithValue("@size_bytes", (object?)photo.SizeBytes ?? DBNull.Value);
                    photoCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await photoCmd.ExecuteNonQueryAsync();
                }

                // Save staff recognitions linked to this review
                if (request.StaffRecognitions != null)
                {
                    foreach (var recognition in request.StaffRecognitions)
                    {
                        var staffKudosId = Guid.NewGuid();
                        var insertKudosSql = """
                            INSERT INTO staff_kudos (id, staff_member_id, business_id, user_id, review_id, created_at_utc)
                            VALUES (@id, @staff_id, @business_id, @user_id, @review_id, @now);
                            """;
                        await using (var skCmd = new NpgsqlCommand(insertKudosSql, connection))
                        {
                            skCmd.Parameters.AddWithValue("@id", staffKudosId);
                            skCmd.Parameters.AddWithValue("@staff_id", recognition.StaffMemberId);
                            skCmd.Parameters.AddWithValue("@business_id", businessId);
                            skCmd.Parameters.AddWithValue("@user_id", userId);
                            skCmd.Parameters.AddWithValue("@review_id", reviewId);
                            skCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                            await skCmd.ExecuteNonQueryAsync();
                        }

                        foreach (var tag in recognition.Tags ?? new List<string>())
                        {
                            var insertSkTagSql = """
                                INSERT INTO staff_kudos_tags (id, staff_kudos_id, tag_name, created_at_utc)
                                VALUES (@id, @kudos_id, @tag, @now);
                                """;
                            await using var skTagCmd = new NpgsqlCommand(insertSkTagSql, connection);
                            skTagCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                            skTagCmd.Parameters.AddWithValue("@kudos_id", staffKudosId);
                            skTagCmd.Parameters.AddWithValue("@tag", tag);
                            skTagCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                            await skTagCmd.ExecuteNonQueryAsync();
                        }
                    }
                }

                // Queue notification for business owners (and fan out push)
                try
                {
                    var notifySql = """
                        INSERT INTO notifications (id, user_id, notification_type, subject, body, created_at_utc)
                        SELECT gen_random_uuid(), bm.user_id, 'new_review',
                               'New review on your business',
                               'A new ' || @rating_text || '-star review was posted.',
                               @created_at
                        FROM business_memberships bm
                        WHERE bm.business_id = @business_id
                          AND bm.user_id != @reviewer_user_id
                          AND EXISTS (
                              SELECT 1 FROM notification_preferences np
                              WHERE np.user_id = bm.user_id AND np.email_on_new_review = TRUE
                          )
                        RETURNING user_id;
                        """;

                    await using var notifyCmd = new NpgsqlCommand(notifySql, connection);
                    notifyCmd.Parameters.AddWithValue("@business_id", businessId);
                    notifyCmd.Parameters.AddWithValue("@reviewer_user_id", userId);
                    notifyCmd.Parameters.AddWithValue("@rating_text", request.Rating.ToString());
                    notifyCmd.Parameters.AddWithValue("@created_at", DateTime.UtcNow);

                    var notifiedUserIds = new List<Guid>();
                    await using (var notifyReader = await notifyCmd.ExecuteReaderAsync())
                    {
                        while (await notifyReader.ReadAsync())
                        {
                            notifiedUserIds.Add(notifyReader.GetGuid(0));
                        }
                    }

                    // Fire-and-forget push fan-out (doesn't block the review post)
                    foreach (var notifiedUserId in notifiedUserIds)
                    {
                        _ = _push.SendToUserAsync(
                            notifiedUserId,
                            "New review on your business",
                            $"A new {request.Rating}-star review was posted.",
                            new { type = "new_review", businessId });
                    }
                }
                catch
                {
                    // Don't fail the review if notification fails
                }

                return Ok(new
                {
                    businessId,
                    reviewId,
                    rating = request.Rating,
                    title = request.Title,
                    body = request.Body,
                    positiveTags = normalizedTags,
                    photoCount = photos.Count
                });
            }
            catch (PostgresException ex) when (ex.SqlState == "23505")
            {
                await CleanupUploadedReviewPhotosAsync(request.Photos);
                return BadRequest("You have already reviewed this business.");
            }
            catch (Exception ex)
            {
                await CleanupUploadedReviewPhotosAsync(request.Photos);

                return StatusCode(500, new
                {
                    message = ex.Message,
                    
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
                    await CleanupUploadedReviewPhotosAsync(request.Photos);
                    return BadRequest("Rating must be between 1 and 5.");
                }
        
                var email =
                    User.FindFirst(ClaimTypes.Email)?.Value ??
                    User.FindFirst(ClaimTypes.Name)?.Value ??
                    User.Identity?.Name;
        
                if (string.IsNullOrWhiteSpace(email))
                {
                    await CleanupUploadedReviewPhotosAsync(request.Photos);
                    return Unauthorized("Email claim not found in token.");
                }
        
                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    await CleanupUploadedReviewPhotosAsync(request.Photos);
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
                        await CleanupUploadedReviewPhotosAsync(request.Photos);
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
        
                await using (var cmd = new NpgsqlCommand(sql, connection))
                {
                    cmd.Parameters.AddWithValue("@rating", (short)request.Rating);
                    cmd.Parameters.AddWithValue("@title", (object?)request.Title ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@body", (object?)request.Body ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@review_id", reviewId);
                    cmd.Parameters.AddWithValue("@business_id", businessId);
                    cmd.Parameters.AddWithValue("@user_id", userId);
        
                    var rows = await cmd.ExecuteNonQueryAsync();
        
                    if (rows == 0)
                    {
                        await CleanupUploadedReviewPhotosAsync(request.Photos);
                        return NotFound("Review not found or you do not own it.");
                    }
                }
        
                var allowedTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "service",
                    "quality",
                    "cleanliness",
                    "value",
                    "experience"
                };
        
                var normalizedTags = (request.PositiveTags ?? new List<string>())
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim().ToLowerInvariant())
                    .Where(x => allowedTags.Contains(x))
                    .Distinct()
                    .ToList();
        
                var deleteTagsSql = """
                    DELETE FROM review_positive_tags
                    WHERE review_id = @review_id;
                    """;
        
                await using (var deleteTagsCmd = new NpgsqlCommand(deleteTagsSql, connection))
                {
                    deleteTagsCmd.Parameters.AddWithValue("@review_id", reviewId);
                    await deleteTagsCmd.ExecuteNonQueryAsync();
                }
        
                foreach (var tag in normalizedTags)
                {
                    var insertTagSql = """
                        INSERT INTO review_positive_tags (
                            id,
                            review_id,
                            tag_name,
                            created_at_utc
                        )
                        VALUES (
                            @id,
                            @review_id,
                            @tag_name,
                            @created_at_utc
                        );
                        """;
        
                    await using var tagCmd = new NpgsqlCommand(insertTagSql, connection);
                    tagCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    tagCmd.Parameters.AddWithValue("@review_id", reviewId);
                    tagCmd.Parameters.AddWithValue("@tag_name", tag);
                    tagCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);
        
                    await tagCmd.ExecuteNonQueryAsync();
                }
        
                var deletePhotoIds = request.DeletePhotoIds ?? new List<Guid>();
        
                if (deletePhotoIds.Count > 0)
                {
                    var getPhotoKeysSql = """
                        SELECT id, storage_key
                        FROM review_photos
                        WHERE review_id = @review_id
                          AND id = ANY(@photo_ids);
                        """;
        
                    var photosToDelete = new List<(Guid Id, string StorageKey)>();
        
                    await using (var getKeysCmd = new NpgsqlCommand(getPhotoKeysSql, connection))
                    {
                        getKeysCmd.Parameters.AddWithValue("@review_id", reviewId);
                        getKeysCmd.Parameters.AddWithValue("@photo_ids", deletePhotoIds.ToArray());
        
                        await using var keysReader = await getKeysCmd.ExecuteReaderAsync();
        
                        while (await keysReader.ReadAsync())
                        {
                            photosToDelete.Add((
                                keysReader.GetGuid(0),
                                keysReader.GetString(1)
                            ));
                        }
                    }
        
                    var deleteDbPhotosSql = """
                        DELETE FROM review_photos
                        WHERE review_id = @review_id
                          AND id = ANY(@photo_ids);
                        """;
        
                    await using (var deleteDbCmd = new NpgsqlCommand(deleteDbPhotosSql, connection))
                    {
                        deleteDbCmd.Parameters.AddWithValue("@review_id", reviewId);
                        deleteDbCmd.Parameters.AddWithValue("@photo_ids", deletePhotoIds.ToArray());
                        await deleteDbCmd.ExecuteNonQueryAsync();
                    }
        
                    foreach (var photo in photosToDelete)
                    {
                        try
                        {
                            await _s3.DeleteObjectAsync(new DeleteObjectRequest
                            {
                                BucketName = _r2.BucketName,
                                Key = photo.StorageKey
                            });
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to delete edited review photo from storage");
                        }
                    }
                }
        
                var newPhotos = request.Photos ?? new List<ReviewPhotoInput>();
        
                if (newPhotos.Count > 5)
                {
                    await CleanupUploadedReviewPhotosAsync(request.Photos);
                    return BadRequest("You can upload at most 5 new photos at a time.");
                }
        
                foreach (var photo in newPhotos)
                {
                    var insertPhotoSql = """
                        INSERT INTO review_photos (
                            id,
                            review_id,
                            storage_key,
                            original_url,
                            content_type,
                            size_bytes,
                            created_at_utc
                        )
                        VALUES (
                            @id,
                            @review_id,
                            @storage_key,
                            @original_url,
                            @content_type,
                            @size_bytes,
                            @created_at_utc
                        );
                        """;
        
                    await using var photoCmd = new NpgsqlCommand(insertPhotoSql, connection);
                    photoCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    photoCmd.Parameters.AddWithValue("@review_id", reviewId);
                    photoCmd.Parameters.AddWithValue("@storage_key", photo.StorageKey);
                    photoCmd.Parameters.AddWithValue("@original_url", photo.OriginalUrl);
                    photoCmd.Parameters.AddWithValue("@content_type", (object?)photo.ContentType ?? DBNull.Value);
                    photoCmd.Parameters.AddWithValue("@size_bytes", (object?)photo.SizeBytes ?? DBNull.Value);
                    photoCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);
        
                    await photoCmd.ExecuteNonQueryAsync();
                }
        
                // Update staff recognitions: delete old ones for this review, insert new
                if (request.StaffRecognitions != null)
                {
                    // Delete existing staff kudos tags for this review's kudos
                    var deleteSkTagsSql = """
                        DELETE FROM staff_kudos_tags
                        WHERE staff_kudos_id IN (SELECT id FROM staff_kudos WHERE review_id = @review_id);
                        """;
                    await using (var dskCmd = new NpgsqlCommand(deleteSkTagsSql, connection))
                    {
                        dskCmd.Parameters.AddWithValue("@review_id", reviewId);
                        await dskCmd.ExecuteNonQueryAsync();
                    }

                    // Delete existing staff kudos for this review
                    var deleteSkSql = "DELETE FROM staff_kudos WHERE review_id = @review_id AND user_id = @user_id;";
                    await using (var dskCmd2 = new NpgsqlCommand(deleteSkSql, connection))
                    {
                        dskCmd2.Parameters.AddWithValue("@review_id", reviewId);
                        dskCmd2.Parameters.AddWithValue("@user_id", userId);
                        await dskCmd2.ExecuteNonQueryAsync();
                    }

                    // Insert new ones
                    foreach (var recognition in request.StaffRecognitions)
                    {
                        var staffKudosId = Guid.NewGuid();
                        var insertKudosSql = """
                            INSERT INTO staff_kudos (id, staff_member_id, business_id, user_id, review_id, created_at_utc)
                            VALUES (@id, @staff_id, @business_id, @user_id, @review_id, @now);
                            """;
                        await using (var skCmd = new NpgsqlCommand(insertKudosSql, connection))
                        {
                            skCmd.Parameters.AddWithValue("@id", staffKudosId);
                            skCmd.Parameters.AddWithValue("@staff_id", recognition.StaffMemberId);
                            skCmd.Parameters.AddWithValue("@business_id", businessId);
                            skCmd.Parameters.AddWithValue("@user_id", userId);
                            skCmd.Parameters.AddWithValue("@review_id", reviewId);
                            skCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                            await skCmd.ExecuteNonQueryAsync();
                        }

                        foreach (var tag in recognition.Tags ?? new List<string>())
                        {
                            var insertSkTagSql = """
                                INSERT INTO staff_kudos_tags (id, staff_kudos_id, tag_name, created_at_utc)
                                VALUES (@id, @kudos_id, @tag, @now);
                                """;
                            await using var skTagCmd = new NpgsqlCommand(insertSkTagSql, connection);
                            skTagCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                            skTagCmd.Parameters.AddWithValue("@kudos_id", staffKudosId);
                            skTagCmd.Parameters.AddWithValue("@tag", tag);
                            skTagCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                            await skTagCmd.ExecuteNonQueryAsync();
                        }
                    }
                }

                return Ok(new
                {
                    reviewId,
                    businessId,
                    rating = request.Rating,
                    title = request.Title,
                    body = request.Body,
                    positiveTags = normalizedTags,
                    deletedPhotoCount = deletePhotoIds.Count,
                    addedPhotoCount = newPhotos.Count
                });
            }
            catch (Exception ex)
            {
                await CleanupUploadedReviewPhotosAsync(request.Photos);

                return StatusCode(500, new
                {
                    message = ex.Message,

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

                var getPhotoKeysSql = """
                    SELECT storage_key
                    FROM review_photos
                    WHERE review_id = @review_id;
                    """;

                var storageKeys = new List<string>();

                await using (var getKeysCmd = new NpgsqlCommand(getPhotoKeysSql, connection))
                {
                    getKeysCmd.Parameters.AddWithValue("@review_id", reviewId);

                    await using var keysReader = await getKeysCmd.ExecuteReaderAsync();

                    while (await keysReader.ReadAsync())
                    {
                        storageKeys.Add(keysReader.GetString(0));
                    }
                }

                // Delete staff kudos tags and kudos linked to this review
                var deleteSkTagsSql = """
                    DELETE FROM staff_kudos_tags
                    WHERE staff_kudos_id IN (SELECT id FROM staff_kudos WHERE review_id = @review_id);
                    """;
                await using (var dskCmd = new NpgsqlCommand(deleteSkTagsSql, connection))
                {
                    dskCmd.Parameters.AddWithValue("@review_id", reviewId);
                    await dskCmd.ExecuteNonQueryAsync();
                }

                var deleteSkSql = "DELETE FROM staff_kudos WHERE review_id = @review_id;";
                await using (var dskCmd2 = new NpgsqlCommand(deleteSkSql, connection))
                {
                    dskCmd2.Parameters.AddWithValue("@review_id", reviewId);
                    await dskCmd2.ExecuteNonQueryAsync();
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

                foreach (var key in storageKeys)
                {
                    try
                    {
                        await _s3.DeleteObjectAsync(new DeleteObjectRequest
                        {
                            BucketName = _r2.BucketName,
                            Key = key
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to delete review photo from storage");
                    }
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message,
                    
                });
            }
        }

        private async Task CleanupUploadedReviewPhotosAsync(List<ReviewPhotoInput>? photos)
        {
            if (photos == null || photos.Count == 0)
            {
                return;
            }

            foreach (var photo in photos)
            {
                if (string.IsNullOrWhiteSpace(photo.StorageKey))
                {
                    continue;
                }

                try
                {
                    await _s3.DeleteObjectAsync(new DeleteObjectRequest
                    {
                        BucketName = _r2.BucketName,
                        Key = photo.StorageKey
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete orphaned review photo");
                }
            }
        }

        [HttpPost("{businessId:guid}/reviews/{reviewId:guid}/flag")]
        [Authorize]
        public async Task<IActionResult> FlagReview(Guid businessId, Guid reviewId, [FromBody] FlagReviewRequest request)
        {
            try
            {
                var email = User.FindFirst(ClaimTypes.Email)?.Value
                    ?? User.FindFirst(ClaimTypes.Name)?.Value
                    ?? User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized();

                var connectionString = _configuration.GetConnectionString("WebApiDatabase");
                await using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();

                // Get user ID
                Guid userId;
                await using (var getUserCmd = new NpgsqlCommand("SELECT id FROM users WHERE email = @email LIMIT 1;", connection))
                {
                    getUserCmd.Parameters.AddWithValue("@email", email);
                    var result = await getUserCmd.ExecuteScalarAsync();
                    if (result == null) return NotFound("User not found.");
                    userId = (Guid)result;
                }

                // Verify review exists for this business
                await using (var checkCmd = new NpgsqlCommand(
                    "SELECT COUNT(*) FROM reviews WHERE id = @review_id AND business_id = @business_id;", connection))
                {
                    checkCmd.Parameters.AddWithValue("@review_id", reviewId);
                    checkCmd.Parameters.AddWithValue("@business_id", businessId);
                    var exists = (long)(await checkCmd.ExecuteScalarAsync() ?? 0L);
                    if (exists == 0) return NotFound("Review not found.");
                }

                // Can't flag own review
                await using (var ownCmd = new NpgsqlCommand(
                    "SELECT COUNT(*) FROM reviews WHERE id = @review_id AND user_id = @user_id;", connection))
                {
                    ownCmd.Parameters.AddWithValue("@review_id", reviewId);
                    ownCmd.Parameters.AddWithValue("@user_id", userId);
                    var isOwn = (long)(await ownCmd.ExecuteScalarAsync() ?? 0L);
                    if (isOwn > 0) return BadRequest(new { message = "You cannot flag your own review." });
                }

                var sql = """
                    INSERT INTO review_flags (id, review_id, user_id, reason, details, created_at_utc)
                    VALUES (@id, @review_id, @user_id, @reason, @details, @now)
                    ON CONFLICT (review_id, user_id) DO NOTHING;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                cmd.Parameters.AddWithValue("@review_id", reviewId);
                cmd.Parameters.AddWithValue("@user_id", userId);
                cmd.Parameters.AddWithValue("@reason", request.Reason);
                cmd.Parameters.AddWithValue("@details", (object?)request.Details ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { message = "Review flagged. Our team will review it." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    public class FlagReviewRequest
    {
        public string Reason { get; set; } = "";
        public string? Details { get; set; }
    }
}