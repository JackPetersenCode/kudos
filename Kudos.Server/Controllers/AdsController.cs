using Amazon.S3;
using Amazon.S3.Model;
using Kudos.Server.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Npgsql;
using System.Security.Claims;

namespace Kudos.Server.Controllers
{
    [ApiController]
    [Route("api/ads")]
    [Authorize]
    public class AdsController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IAmazonS3 _s3;
        private readonly CloudflareR2Options _r2;

        public AdsController(IConfiguration configuration, IAmazonS3 s3, IOptions<CloudflareR2Options> r2Options)
        {
            _configuration = configuration;
            _s3 = s3;
            _r2 = r2Options.Value;
        }

        [HttpGet("mine")]
        public async Task<IActionResult> GetMyAds()
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                {
                    return Unauthorized("Email claim not found in token.");
                }

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        a.id,
                        a.business_id,
                        b.name,
                        b.slug,
                        a.title,
                        a.headline,
                        a.description,
                        a.image_url,
                        a.destination_url,
                        a.status,
                        a.created_at_utc,
                        a.updated_at_utc
                    FROM users u
                    INNER JOIN business_memberships bm
                        ON bm.user_id = u.id
                    INNER JOIN businesses b
                        ON b.id = bm.business_id
                    INNER JOIN ads a
                        ON a.business_id = b.id
                    WHERE u.email = @email
                    ORDER BY a.created_at_utc DESC;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@email", email);

                await using var reader = await cmd.ExecuteReaderAsync();
                var ads = new List<object>();

                while (await reader.ReadAsync())
                {
                    ads.Add(new
                    {
                        id = reader.GetGuid(0),
                        businessId = reader.GetGuid(1),
                        businessName = reader.GetString(2),
                        businessSlug = reader.GetString(3),
                        title = reader.GetString(4),
                        headline = reader.IsDBNull(5) ? null : reader.GetString(5),
                        description = reader.IsDBNull(6) ? null : reader.GetString(6),
                        imageUrl = reader.IsDBNull(7) ? null : reader.GetString(7),
                        destinationUrl = reader.GetString(8),
                        status = reader.GetString(9),
                        createdAtUtc = reader.GetDateTime(10),
                        updatedAtUtc = reader.GetDateTime(11)
                    });
                }

                return Ok(ads);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{adId:guid}")]
        public async Task<IActionResult> GetMyAd(Guid adId)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                {
                    return Unauthorized("Email claim not found in token.");
                }

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        a.id,
                        a.business_id,
                        b.name,
                        b.slug,
                        a.title,
                        a.headline,
                        a.description,
                        a.image_url,
                        a.destination_url,
                        a.status,
                        a.created_at_utc,
                        a.updated_at_utc
                    FROM users u
                    INNER JOIN business_memberships bm
                        ON bm.user_id = u.id
                    INNER JOIN businesses b
                        ON b.id = bm.business_id
                    INNER JOIN ads a
                        ON a.business_id = b.id
                    WHERE u.email = @email
                      AND a.id = @ad_id
                    LIMIT 1;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@email", email);
                cmd.Parameters.AddWithValue("@ad_id", adId);

                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                {
                    return NotFound("Ad not found.");
                }

                return Ok(new
                {
                    id = reader.GetGuid(0),
                    businessId = reader.GetGuid(1),
                    businessName = reader.GetString(2),
                    businessSlug = reader.GetString(3),
                    title = reader.GetString(4),
                    headline = reader.IsDBNull(5) ? null : reader.GetString(5),
                    description = reader.IsDBNull(6) ? null : reader.GetString(6),
                    imageUrl = reader.IsDBNull(7) ? null : reader.GetString(7),
                    destinationUrl = reader.GetString(8),
                    status = reader.GetString(9),
                    createdAtUtc = reader.GetDateTime(10),
                    updatedAtUtc = reader.GetDateTime(11)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{adId:guid}/campaigns")]
        public async Task<IActionResult> GetMyAdCampaigns(Guid adId)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                {
                    return Unauthorized("Email claim not found in token.");
                }

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var canAccessSql = """
                    SELECT a.business_id
                    FROM ads a
                    INNER JOIN businesses b
                        ON b.id = a.business_id
                    INNER JOIN business_memberships bm
                        ON bm.business_id = b.id
                    INNER JOIN users u
                        ON u.id = bm.user_id
                    WHERE a.id = @ad_id
                      AND u.email = @email
                      AND bm.membership_role IN ('owner', 'admin', 'manager')
                    LIMIT 1;
                    """;

                await using (var accessCmd = new NpgsqlCommand(canAccessSql, connection))
                {
                    accessCmd.Parameters.AddWithValue("@ad_id", adId);
                    accessCmd.Parameters.AddWithValue("@email", email);

                    var accessResult = await accessCmd.ExecuteScalarAsync();
                    if (accessResult == null)
                    {
                        return NotFound("Ad not found or access denied.");
                    }
                }

                var sql = """
                    SELECT
                        ac.id,
                        ac.ad_id,
                        ac.start_at_utc,
                        ac.end_at_utc,
                        ac.budget_cents,
                        ac.pricing_model,
                        ac.bid_cents,
                        ac.is_active,
                        ac.created_at_utc
                    FROM ad_campaigns ac
                    WHERE ac.ad_id = @ad_id
                    ORDER BY ac.created_at_utc DESC;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@ad_id", adId);

                await using var reader = await cmd.ExecuteReaderAsync();
                var campaigns = new List<object>();

                while (await reader.ReadAsync())
                {
                    campaigns.Add(new
                    {
                        id = reader.GetGuid(0),
                        adId = reader.GetGuid(1),
                        startAtUtc = reader.GetDateTime(2),
                        endAtUtc = reader.GetDateTime(3),
                        budgetCents = reader.GetInt32(4),
                        pricingModel = reader.GetString(5),
                        bidCents = reader.IsDBNull(6) ? (int?)null : reader.GetInt32(6),
                        isActive = reader.GetBoolean(7),
                        createdAtUtc = reader.GetDateTime(8)
                    });
                }

                return Ok(campaigns);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("campaigns/{campaignId:guid}")]
        public async Task<IActionResult> GetMyCampaign(Guid campaignId)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                {
                    return Unauthorized("Email claim not found in token.");
                }

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var sql = """
                    SELECT
                        ac.id,
                        ac.ad_id,
                        a.business_id,
                        b.name,
                        b.slug,
                        ac.start_at_utc,
                        ac.end_at_utc,
                        ac.budget_cents,
                        ac.pricing_model,
                        ac.bid_cents,
                        ac.is_active,
                        ac.created_at_utc
                    FROM ad_campaigns ac
                    INNER JOIN ads a
                        ON a.id = ac.ad_id
                    INNER JOIN businesses b
                        ON b.id = a.business_id
                    INNER JOIN business_memberships bm
                        ON bm.business_id = b.id
                    INNER JOIN users u
                        ON u.id = bm.user_id
                    WHERE ac.id = @campaign_id
                      AND u.email = @email
                      AND bm.membership_role IN ('owner', 'admin', 'manager')
                    LIMIT 1;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@campaign_id", campaignId);
                cmd.Parameters.AddWithValue("@email", email);

                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                {
                    return NotFound("Campaign not found.");
                }

                var result = new
                {
                    id = reader.GetGuid(0),
                    adId = reader.GetGuid(1),
                    businessId = reader.GetGuid(2),
                    businessName = reader.GetString(3),
                    businessSlug = reader.GetString(4),
                    startAtUtc = reader.GetDateTime(5),
                    endAtUtc = reader.GetDateTime(6),
                    budgetCents = reader.GetInt32(7),
                    pricingModel = reader.GetString(8),
                    bidCents = reader.IsDBNull(9) ? (int?)null : reader.GetInt32(9),
                    isActive = reader.GetBoolean(10),
                    createdAtUtc = reader.GetDateTime(11),
                    placementSlugs = new List<string>(),
                    targeting = new
                    {
                        categorySlug = (string?)null,
                        city = (string?)null,
                        state = (string?)null
                    }
                };

                await reader.CloseAsync();

                var placementSlugs = new List<string>();
                var placementsSql = """
                    SELECT ap.slug
                    FROM campaign_placements cp
                    INNER JOIN ad_placements ap
                        ON ap.id = cp.placement_id
                    WHERE cp.campaign_id = @campaign_id
                    ORDER BY ap.slug;
                    """;

                await using (var placementsCmd = new NpgsqlCommand(placementsSql, connection))
                {
                    placementsCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    await using var placementsReader = await placementsCmd.ExecuteReaderAsync();

                    while (await placementsReader.ReadAsync())
                    {
                        placementSlugs.Add(placementsReader.GetString(0));
                    }
                }

                string? categorySlug = null;
                string? city = null;
                string? state = null;

                var targetingSql = """
                    SELECT category_slug, city, state
                    FROM ad_targeting
                    WHERE campaign_id = @campaign_id
                    LIMIT 1;
                    """;

                await using (var targetingCmd = new NpgsqlCommand(targetingSql, connection))
                {
                    targetingCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    await using var targetingReader = await targetingCmd.ExecuteReaderAsync();

                    if (await targetingReader.ReadAsync())
                    {
                        categorySlug = targetingReader.IsDBNull(0) ? null : targetingReader.GetString(0);
                        city = targetingReader.IsDBNull(1) ? null : targetingReader.GetString(1);
                        state = targetingReader.IsDBNull(2) ? null : targetingReader.GetString(2);
                    }
                }

                return Ok(new
                {
                    result.id,
                    result.adId,
                    result.businessId,
                    result.businessName,
                    result.businessSlug,
                    result.startAtUtc,
                    result.endAtUtc,
                    result.budgetCents,
                    result.pricingModel,
                    result.bidCents,
                    result.isActive,
                    result.createdAtUtc,
                    placementSlugs,
                    targeting = new
                    {
                        categorySlug,
                        city,
                        state
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateAd([FromBody] CreateAdRequest request)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                {
                    return Unauthorized("Email claim not found in token.");
                }

                if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length < 3)
                {
                    return BadRequest("Ad title must be at least 3 characters.");
                }

                if (string.IsNullOrWhiteSpace(request.DestinationUrl))
                {
                    return BadRequest("Destination URL is required.");
                }

                // URL validation
                if (!Uri.TryCreate(request.DestinationUrl, UriKind.Absolute, out var destUri)
                    || (destUri.Scheme != "http" && destUri.Scheme != "https"))
                {
                    return BadRequest("Destination URL must be a valid HTTP or HTTPS URL.");
                }

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                if (!await UserCanManageBusiness(connection, email, request.BusinessId))
                {
                    return Forbid();
                }

                // Rate limiting: max 10 ads per business per day
                var rateSql = """
                    SELECT COUNT(*)::int FROM ads
                    WHERE business_id = @business_id
                      AND created_at_utc >= now() - INTERVAL '24 hours';
                    """;
                await using (var rateCmd = new NpgsqlCommand(rateSql, connection))
                {
                    rateCmd.Parameters.AddWithValue("@business_id", request.BusinessId);
                    var count = (int)(await rateCmd.ExecuteScalarAsync() ?? 0);
                    if (count >= 10)
                    {
                        return BadRequest("You can create at most 10 ads per business per day.");
                    }
                }

                var adId = Guid.NewGuid();

                var sql = """
                    INSERT INTO ads (
                        id,
                        business_id,
                        title,
                        headline,
                        description,
                        image_url,
                        destination_url,
                        status,
                        created_at_utc,
                        updated_at_utc
                    )
                    VALUES (
                        @id,
                        @business_id,
                        @title,
                        @headline,
                        @description,
                        @image_url,
                        @destination_url,
                        @status,
                        @created_at_utc,
                        @updated_at_utc
                    );
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@id", adId);
                cmd.Parameters.AddWithValue("@business_id", request.BusinessId);
                cmd.Parameters.AddWithValue("@title", request.Title);
                cmd.Parameters.AddWithValue("@headline", (object?)request.Headline ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@description", (object?)request.Description ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@image_url", (object?)request.ImageUrl ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@destination_url", request.DestinationUrl);
                cmd.Parameters.AddWithValue("@status", request.Status);
                cmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);
                cmd.Parameters.AddWithValue("@updated_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new
                {
                    id = adId,
                    success = true
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("{adId:guid}")]
        public async Task<IActionResult> UpdateAd(Guid adId, [FromBody] UpdateAdRequest request)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                {
                    return Unauthorized("Email claim not found in token.");
                }

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var getBusinessSql = """
                    SELECT a.business_id
                    FROM ads a
                    WHERE a.id = @ad_id
                    LIMIT 1;
                    """;

                Guid businessId;
                await using (var getBusinessCmd = new NpgsqlCommand(getBusinessSql, connection))
                {
                    getBusinessCmd.Parameters.AddWithValue("@ad_id", adId);
                    var result = await getBusinessCmd.ExecuteScalarAsync();
                    if (result == null)
                    {
                        return NotFound("Ad not found.");
                    }

                    businessId = (Guid)result;
                }

                if (!await UserCanManageBusiness(connection, email, businessId))
                {
                    return Forbid();
                }

                var sql = """
                    UPDATE ads
                    SET
                        title = @title,
                        headline = @headline,
                        description = @description,
                        image_url = @image_url,
                        destination_url = @destination_url,
                        status = @status,
                        updated_at_utc = @updated_at_utc
                    WHERE id = @ad_id;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@ad_id", adId);
                cmd.Parameters.AddWithValue("@title", request.Title);
                cmd.Parameters.AddWithValue("@headline", (object?)request.Headline ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@description", (object?)request.Description ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@image_url", (object?)request.ImageUrl ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@destination_url", request.DestinationUrl);
                cmd.Parameters.AddWithValue("@status", request.Status);
                cmd.Parameters.AddWithValue("@updated_at_utc", DateTime.UtcNow);

                await cmd.ExecuteNonQueryAsync();

                return Ok(new { id = adId, success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("{adId:guid}/campaigns")]
        public async Task<IActionResult> CreateCampaign(Guid adId, [FromBody] CreateAdCampaignRequest request)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                {
                    return Unauthorized("Email claim not found in token.");
                }

                if (request.EndAtUtc <= request.StartAtUtc)
                {
                    return BadRequest("endAtUtc must be later than startAtUtc.");
                }

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var getBusinessSql = """
                    SELECT business_id
                    FROM ads
                    WHERE id = @ad_id
                    LIMIT 1;
                    """;

                Guid businessId;
                await using (var getBusinessCmd = new NpgsqlCommand(getBusinessSql, connection))
                {
                    getBusinessCmd.Parameters.AddWithValue("@ad_id", adId);
                    var result = await getBusinessCmd.ExecuteScalarAsync();
                    if (result == null)
                    {
                        return NotFound("Ad not found.");
                    }

                    businessId = (Guid)result;
                }

                if (!await UserCanManageBusiness(connection, email, businessId))
                {
                    return Forbid();
                }

                var campaignId = Guid.NewGuid();

                var insertCampaignSql = """
                    INSERT INTO ad_campaigns (
                        id,
                        ad_id,
                        start_at_utc,
                        end_at_utc,
                        budget_cents,
                        pricing_model,
                        bid_cents,
                        is_active,
                        created_at_utc
                    )
                    VALUES (
                        @id,
                        @ad_id,
                        @start_at_utc,
                        @end_at_utc,
                        @budget_cents,
                        @pricing_model,
                        @bid_cents,
                        @is_active,
                        @created_at_utc
                    );
                    """;

                await using (var campaignCmd = new NpgsqlCommand(insertCampaignSql, connection))
                {
                    campaignCmd.Parameters.AddWithValue("@id", campaignId);
                    campaignCmd.Parameters.AddWithValue("@ad_id", adId);
                    campaignCmd.Parameters.AddWithValue("@start_at_utc", request.StartAtUtc);
                    campaignCmd.Parameters.AddWithValue("@end_at_utc", request.EndAtUtc);
                    campaignCmd.Parameters.AddWithValue("@budget_cents", request.BudgetCents);
                    campaignCmd.Parameters.AddWithValue("@pricing_model", request.PricingModel);
                    campaignCmd.Parameters.AddWithValue("@bid_cents", (object?)request.BidCents ?? DBNull.Value);
                    campaignCmd.Parameters.AddWithValue("@is_active", true);
                    campaignCmd.Parameters.AddWithValue("@created_at_utc", DateTime.UtcNow);

                    await campaignCmd.ExecuteNonQueryAsync();
                }

                foreach (var placementSlug in request.PlacementSlugs.Distinct(StringComparer.OrdinalIgnoreCase))
                {
                    var placementSql = """
                        INSERT INTO campaign_placements (id, campaign_id, placement_id)
                        SELECT @id, @campaign_id, ap.id
                        FROM ad_placements ap
                        WHERE ap.slug = @placement_slug
                        ON CONFLICT (campaign_id, placement_id) DO NOTHING;
                        """;

                    await using var placementCmd = new NpgsqlCommand(placementSql, connection);
                    placementCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    placementCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    placementCmd.Parameters.AddWithValue("@placement_slug", placementSlug);
                    await placementCmd.ExecuteNonQueryAsync();
                }

                var targetingSql = """
                    INSERT INTO ad_targeting (
                        id,
                        campaign_id,
                        category_slug,
                        city,
                        state
                    )
                    VALUES (
                        @id,
                        @campaign_id,
                        @category_slug,
                        @city,
                        @state
                    );
                    """;

                await using (var targetingCmd = new NpgsqlCommand(targetingSql, connection))
                {
                    targetingCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    targetingCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    targetingCmd.Parameters.AddWithValue("@category_slug", (object?)request.CategorySlug ?? DBNull.Value);
                    targetingCmd.Parameters.AddWithValue("@city", (object?)request.City ?? DBNull.Value);
                    targetingCmd.Parameters.AddWithValue("@state", (object?)request.State ?? DBNull.Value);
                    await targetingCmd.ExecuteNonQueryAsync();
                }

                return Ok(new { id = campaignId, success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("campaigns/{campaignId:guid}")]
        public async Task<IActionResult> UpdateCampaign(Guid campaignId, [FromBody] CreateAdCampaignRequest request)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                {
                    return Unauthorized("Email claim not found in token.");
                }

                if (request.EndAtUtc <= request.StartAtUtc)
                {
                    return BadRequest("endAtUtc must be later than startAtUtc.");
                }

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var ownershipSql = """
                    SELECT a.business_id
                    FROM ad_campaigns ac
                    INNER JOIN ads a
                        ON a.id = ac.ad_id
                    INNER JOIN businesses b
                        ON b.id = a.business_id
                    INNER JOIN business_memberships bm
                        ON bm.business_id = b.id
                    INNER JOIN users u
                        ON u.id = bm.user_id
                    WHERE ac.id = @campaign_id
                      AND u.email = @email
                      AND bm.membership_role IN ('owner', 'admin', 'manager')
                    LIMIT 1;
                    """;

                Guid businessId;
                await using (var ownershipCmd = new NpgsqlCommand(ownershipSql, connection))
                {
                    ownershipCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    ownershipCmd.Parameters.AddWithValue("@email", email);

                    var result = await ownershipCmd.ExecuteScalarAsync();
                    if (result == null)
                    {
                        return NotFound("Campaign not found.");
                    }

                    businessId = (Guid)result;
                }

                if (!await UserCanManageBusiness(connection, email, businessId))
                {
                    return Forbid();
                }

                var updateCampaignSql = """
                    UPDATE ad_campaigns
                    SET
                        start_at_utc = @start_at_utc,
                        end_at_utc = @end_at_utc,
                        budget_cents = @budget_cents,
                        pricing_model = @pricing_model,
                        bid_cents = @bid_cents
                    WHERE id = @campaign_id;
                    """;

                await using (var updateCampaignCmd = new NpgsqlCommand(updateCampaignSql, connection))
                {
                    updateCampaignCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    updateCampaignCmd.Parameters.AddWithValue("@start_at_utc", request.StartAtUtc);
                    updateCampaignCmd.Parameters.AddWithValue("@end_at_utc", request.EndAtUtc);
                    updateCampaignCmd.Parameters.AddWithValue("@budget_cents", request.BudgetCents);
                    updateCampaignCmd.Parameters.AddWithValue("@pricing_model", request.PricingModel);
                    updateCampaignCmd.Parameters.AddWithValue("@bid_cents", (object?)request.BidCents ?? DBNull.Value);

                    await updateCampaignCmd.ExecuteNonQueryAsync();
                }

                var deletePlacementsSql = """
                    DELETE FROM campaign_placements
                    WHERE campaign_id = @campaign_id;
                    """;

                await using (var deletePlacementsCmd = new NpgsqlCommand(deletePlacementsSql, connection))
                {
                    deletePlacementsCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    await deletePlacementsCmd.ExecuteNonQueryAsync();
                }

                foreach (var placementSlug in request.PlacementSlugs.Distinct(StringComparer.OrdinalIgnoreCase))
                {
                    var insertPlacementSql = """
                        INSERT INTO campaign_placements (id, campaign_id, placement_id)
                        SELECT @id, @campaign_id, ap.id
                        FROM ad_placements ap
                        WHERE ap.slug = @placement_slug
                        ON CONFLICT (campaign_id, placement_id) DO NOTHING;
                        """;

                    await using var placementCmd = new NpgsqlCommand(insertPlacementSql, connection);
                    placementCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    placementCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    placementCmd.Parameters.AddWithValue("@placement_slug", placementSlug);
                    await placementCmd.ExecuteNonQueryAsync();
                }

                var deleteTargetingSql = """
                    DELETE FROM ad_targeting
                    WHERE campaign_id = @campaign_id;
                    """;

                await using (var deleteTargetingCmd = new NpgsqlCommand(deleteTargetingSql, connection))
                {
                    deleteTargetingCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    await deleteTargetingCmd.ExecuteNonQueryAsync();
                }

                var insertTargetingSql = """
                    INSERT INTO ad_targeting (
                        id,
                        campaign_id,
                        category_slug,
                        city,
                        state
                    )
                    VALUES (
                        @id,
                        @campaign_id,
                        @category_slug,
                        @city,
                        @state
                    );
                    """;

                await using (var targetingCmd = new NpgsqlCommand(insertTargetingSql, connection))
                {
                    targetingCmd.Parameters.AddWithValue("@id", Guid.NewGuid());
                    targetingCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    targetingCmd.Parameters.AddWithValue("@category_slug", (object?)request.CategorySlug ?? DBNull.Value);
                    targetingCmd.Parameters.AddWithValue("@city", (object?)request.City ?? DBNull.Value);
                    targetingCmd.Parameters.AddWithValue("@state", (object?)request.State ?? DBNull.Value);

                    await targetingCmd.ExecuteNonQueryAsync();
                }

                return Ok(new { id = campaignId, success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("{adId:guid}/resubmit")]
        public async Task<IActionResult> ResubmitAd(Guid adId)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized("Email claim not found in token.");

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                // Get ad details and verify ownership
                var sql = """
                    SELECT a.title, a.headline, a.description, a.image_url, a.destination_url, a.status, a.business_id
                    FROM ads a
                    INNER JOIN business_memberships bm ON bm.business_id = a.business_id
                    INNER JOIN users u ON u.id = bm.user_id
                    WHERE a.id = @ad_id AND u.email = @email
                    LIMIT 1;
                    """;

                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@ad_id", adId);
                cmd.Parameters.AddWithValue("@email", email);

                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                    return NotFound("Ad not found or access denied.");

                var title = reader.GetString(0);
                var headline = reader.IsDBNull(1) ? null : reader.GetString(1);
                var description = reader.IsDBNull(2) ? null : reader.GetString(2);
                var imageUrl = reader.IsDBNull(3) ? null : reader.GetString(3);
                var destinationUrl = reader.GetString(4);
                var currentStatus = reader.GetString(5);

                await reader.CloseAsync();

                if (currentStatus != "rejected" && currentStatus != "draft")
                    return BadRequest("Only rejected or draft ads can be re-submitted.");

                // Run AI review
                var openAi = HttpContext.RequestServices.GetRequiredService<Kudos.Server.Services.OpenAIService>();
                var review = await openAi.ReviewAd(title, headline, description, imageUrl, destinationUrl);

                var newStatus = review.Decision == "reject" ? "rejected" : "active";

                var updateSql = "UPDATE ads SET status = @status, updated_at_utc = @now WHERE id = @ad_id;";
                await using (var updateCmd = new NpgsqlCommand(updateSql, connection))
                {
                    updateCmd.Parameters.AddWithValue("@status", newStatus);
                    updateCmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
                    updateCmd.Parameters.AddWithValue("@ad_id", adId);
                    await updateCmd.ExecuteNonQueryAsync();
                }

                // If approved and there's a payment hold, capture it
                if (newStatus == "active")
                {
                    var stripeKey = _configuration["Stripe:SecretKey"];
                    if (!string.IsNullOrWhiteSpace(stripeKey))
                    {
                        var piSql = """
                            SELECT stripe_payment_intent_id FROM ad_campaigns
                            WHERE ad_id = @ad_id AND stripe_payment_intent_id IS NOT NULL LIMIT 1;
                            """;
                        await using var piCmd = new NpgsqlCommand(piSql, connection);
                        piCmd.Parameters.AddWithValue("@ad_id", adId);
                        var piId = await piCmd.ExecuteScalarAsync() as string;

                        if (!string.IsNullOrWhiteSpace(piId))
                        {
                            try
                            {
                                Stripe.StripeConfiguration.ApiKey = stripeKey;
                                var piService = new Stripe.PaymentIntentService();
                                await piService.CaptureAsync(piId);
                            }
                            catch (Stripe.StripeException ex)
                            {
                            }
                        }
                    }
                }

                return Ok(new
                {
                    id = adId,
                    status = newStatus,
                    reviewDecision = review.Decision,
                    reviewReason = review.Reason
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("{adId:guid}")]
        public async Task<IActionResult> DeleteAd(Guid adId)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized("Email claim not found in token.");

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var getBusinessSql = "SELECT business_id FROM ads WHERE id = @ad_id LIMIT 1;";
                Guid businessId;
                await using (var cmd = new NpgsqlCommand(getBusinessSql, connection))
                {
                    cmd.Parameters.AddWithValue("@ad_id", adId);
                    var result = await cmd.ExecuteScalarAsync();
                    if (result == null) return NotFound("Ad not found.");
                    businessId = (Guid)result;
                }

                if (!await UserCanManageBusiness(connection, email, businessId))
                    return Forbid();

                var sql = "DELETE FROM ads WHERE id = @ad_id;";
                await using var deleteCmd = new NpgsqlCommand(sql, connection);
                deleteCmd.Parameters.AddWithValue("@ad_id", adId);
                await deleteCmd.ExecuteNonQueryAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("campaigns/{campaignId:guid}/budget")]
        public async Task<IActionResult> UpdateCampaignBudget(Guid campaignId, [FromBody] UpdateBudgetRequest request)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized("Email claim not found in token.");

                if (request.BudgetCents <= 0)
                    return BadRequest("Budget must be greater than zero.");

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var ownershipSql = """
                    SELECT a.business_id
                    FROM ad_campaigns ac
                    INNER JOIN ads a ON a.id = ac.ad_id
                    INNER JOIN business_memberships bm ON bm.business_id = a.business_id
                    INNER JOIN users u ON u.id = bm.user_id
                    WHERE ac.id = @campaign_id AND u.email = @email
                      AND bm.membership_role IN ('owner', 'admin', 'manager')
                    LIMIT 1;
                    """;

                await using (var ownerCmd = new NpgsqlCommand(ownershipSql, connection))
                {
                    ownerCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    ownerCmd.Parameters.AddWithValue("@email", email);
                    var result = await ownerCmd.ExecuteScalarAsync();
                    if (result == null) return NotFound("Campaign not found.");
                }

                var sql = "UPDATE ad_campaigns SET budget_cents = @budget_cents WHERE id = @campaign_id;";
                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@budget_cents", request.BudgetCents);
                cmd.Parameters.AddWithValue("@campaign_id", campaignId);
                await cmd.ExecuteNonQueryAsync();

                return Ok(new { campaignId, budgetCents = request.BudgetCents });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("campaigns/{campaignId:guid}/toggle")]
        public async Task<IActionResult> ToggleCampaign(Guid campaignId)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized("Email claim not found in token.");

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var ownershipSql = """
                    SELECT a.business_id
                    FROM ad_campaigns ac
                    INNER JOIN ads a ON a.id = ac.ad_id
                    INNER JOIN business_memberships bm ON bm.business_id = a.business_id
                    INNER JOIN users u ON u.id = bm.user_id
                    WHERE ac.id = @campaign_id AND u.email = @email
                      AND bm.membership_role IN ('owner', 'admin', 'manager')
                    LIMIT 1;
                    """;

                await using (var ownerCmd = new NpgsqlCommand(ownershipSql, connection))
                {
                    ownerCmd.Parameters.AddWithValue("@campaign_id", campaignId);
                    ownerCmd.Parameters.AddWithValue("@email", email);
                    var result = await ownerCmd.ExecuteScalarAsync();
                    if (result == null) return NotFound("Campaign not found.");
                }

                var sql = "UPDATE ad_campaigns SET is_active = NOT is_active WHERE id = @campaign_id;";
                await using var cmd = new NpgsqlCommand(sql, connection);
                cmd.Parameters.AddWithValue("@campaign_id", campaignId);
                await cmd.ExecuteNonQueryAsync();

                return Ok(new { campaignId, toggled = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{adId:guid}/performance")]
        public async Task<IActionResult> GetAdPerformance(Guid adId)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized("Email claim not found in token.");

                await using var connection = new NpgsqlConnection(GetConnectionString());
                await connection.OpenAsync();

                var getBusinessSql = "SELECT business_id FROM ads WHERE id = @ad_id LIMIT 1;";
                Guid businessId;
                await using (var cmd = new NpgsqlCommand(getBusinessSql, connection))
                {
                    cmd.Parameters.AddWithValue("@ad_id", adId);
                    var result = await cmd.ExecuteScalarAsync();
                    if (result == null) return NotFound("Ad not found.");
                    businessId = (Guid)result;
                }

                if (!await UserCanManageBusiness(connection, email, businessId))
                    return Forbid();

                // Impressions count
                int impressions;
                await using (var cmd = new NpgsqlCommand("SELECT COUNT(*)::int FROM ad_impressions WHERE ad_id = @ad_id;", connection))
                {
                    cmd.Parameters.AddWithValue("@ad_id", adId);
                    impressions = (int)(await cmd.ExecuteScalarAsync() ?? 0);
                }

                // Clicks count
                int clicks;
                await using (var cmd = new NpgsqlCommand("SELECT COUNT(*)::int FROM ad_clicks WHERE ad_id = @ad_id;", connection))
                {
                    cmd.Parameters.AddWithValue("@ad_id", adId);
                    clicks = (int)(await cmd.ExecuteScalarAsync() ?? 0);
                }

                // Campaign budget and spend
                var spendSql = """
                    SELECT
                        ac.budget_cents,
                        ac.pricing_model,
                        ac.bid_cents,
                        CASE ac.pricing_model
                            WHEN 'cpc' THEN COALESCE(
                                (SELECT COUNT(*)::bigint * ac.bid_cents FROM ad_clicks WHERE ad_id = @ad_id), 0
                            )
                            WHEN 'cpm' THEN COALESCE(
                                (SELECT COUNT(*)::bigint * ac.bid_cents / 1000 FROM ad_impressions WHERE ad_id = @ad_id), 0
                            )
                            WHEN 'flat' THEN ac.budget_cents
                            ELSE 0
                        END AS spent_cents
                    FROM ad_campaigns ac
                    WHERE ac.ad_id = @ad_id AND ac.is_active = TRUE
                    ORDER BY ac.created_at_utc DESC
                    LIMIT 1;
                    """;

                int budgetCents = 0;
                long spentCents = 0;
                string pricingModel = "flat";
                int? bidCents = null;

                await using (var spendCmd = new NpgsqlCommand(spendSql, connection))
                {
                    spendCmd.Parameters.AddWithValue("@ad_id", adId);
                    await using var spendReader = await spendCmd.ExecuteReaderAsync();
                    if (await spendReader.ReadAsync())
                    {
                        budgetCents = spendReader.GetInt32(0);
                        pricingModel = spendReader.GetString(1);
                        bidCents = spendReader.IsDBNull(2) ? null : (int?)spendReader.GetInt32(2);
                        spentCents = spendReader.GetInt64(3);
                    }
                }

                // By day (last 30 days)
                var byDaySql = """
                    SELECT day, event_type, count FROM (
                        SELECT TO_CHAR(viewed_at_utc, 'YYYY-MM-DD') AS day, 'impression' AS event_type, COUNT(*)::int AS count
                        FROM ad_impressions WHERE ad_id = @ad_id AND viewed_at_utc >= now() - INTERVAL '30 days'
                        GROUP BY day
                        UNION ALL
                        SELECT TO_CHAR(clicked_at_utc, 'YYYY-MM-DD') AS day, 'click' AS event_type, COUNT(*)::int AS count
                        FROM ad_clicks WHERE ad_id = @ad_id AND clicked_at_utc >= now() - INTERVAL '30 days'
                        GROUP BY day
                    ) combined ORDER BY day ASC;
                    """;

                var byDay = new List<object>();
                await using (var byDayCmd = new NpgsqlCommand(byDaySql, connection))
                {
                    byDayCmd.Parameters.AddWithValue("@ad_id", adId);
                    await using var reader = await byDayCmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        byDay.Add(new
                        {
                            day = reader.GetString(0),
                            eventType = reader.GetString(1),
                            count = reader.GetInt32(2)
                        });
                    }
                }

                // By placement
                var byPlacementSql = """
                    SELECT placement_slug, event_type, count FROM (
                        SELECT placement_slug, 'impression' AS event_type, COUNT(*)::int AS count
                        FROM ad_impressions WHERE ad_id = @ad_id GROUP BY placement_slug
                        UNION ALL
                        SELECT placement_slug, 'click' AS event_type, COUNT(*)::int AS count
                        FROM ad_clicks WHERE ad_id = @ad_id GROUP BY placement_slug
                    ) combined ORDER BY count DESC;
                    """;

                var byPlacement = new List<object>();
                await using (var bpCmd = new NpgsqlCommand(byPlacementSql, connection))
                {
                    bpCmd.Parameters.AddWithValue("@ad_id", adId);
                    await using var reader = await bpCmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        byPlacement.Add(new
                        {
                            placementSlug = reader.GetString(0),
                            eventType = reader.GetString(1),
                            count = reader.GetInt32(2)
                        });
                    }
                }

                return Ok(new
                {
                    impressions,
                    clicks,
                    ctr = impressions > 0 ? Math.Round((double)clicks / impressions * 100, 2) : 0,
                    budgetCents,
                    spentCents,
                    remainingCents = Math.Max(0, budgetCents - spentCents),
                    pricingModel,
                    bidCents,
                    byDay,
                    byPlacement
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private string? GetCurrentEmail()
        {
            return User.FindFirst(ClaimTypes.Email)?.Value
                ?? User.FindFirst(ClaimTypes.Name)?.Value
                ?? User.Identity?.Name;
        }

        private string GetConnectionString()
        {
            var cs = _configuration.GetConnectionString("WebApiDatabase");
            if (string.IsNullOrWhiteSpace(cs))
            {
                throw new InvalidOperationException("Missing connection string: WebApiDatabase");
            }

            return cs;
        }

        private static async Task<bool> UserCanManageBusiness(NpgsqlConnection connection, string email, Guid businessId)
        {
            var sql = """
                SELECT 1
                FROM users u
                INNER JOIN business_memberships bm
                    ON bm.user_id = u.id
                WHERE u.email = @email
                  AND bm.business_id = @business_id
                  AND bm.membership_role IN ('owner', 'admin', 'manager')
                LIMIT 1;
                """;

            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@email", email);
            cmd.Parameters.AddWithValue("@business_id", businessId);

            var result = await cmd.ExecuteScalarAsync();
            return result != null;
        }

        [HttpPost("upload-image")]
        public async Task<IActionResult> CreateAdImageUploadUrl([FromBody] AdImageUploadRequest request)
        {
            try
            {
                var email = GetCurrentEmail();
                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized();

                var extension = Path.GetExtension(request.FileName);
                var key = $"ads/{Guid.NewGuid()}{extension}";

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
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    public class AdImageUploadRequest
    {
        public string FileName { get; set; } = "";
        public string ContentType { get; set; } = "image/jpeg";
    }
}