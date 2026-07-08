using System.Text;
using System.Threading.RateLimiting;
using Amazon.Runtime;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Kudos.Server.Data;
using Kudos.Server.Services;

// Load .env for local development only. In production, configuration comes
// from real environment variables (see AddEnvironmentVariables below), so a
// dev .env file should never be present in the image (see .dockerignore).
if (File.Exists(".env"))
{
    DotNetEnv.Env.Load();
}

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();

// Trust the proxy (Railway/Vercel/nginx) so RemoteIpAddress and the scheme
// reflect the real client, not the load balancer. Required for correct
// per-client rate limiting and HTTPS detection behind a reverse proxy.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Hosting platform proxies are not on a known private subnet; clear the
    // default restrictions so forwarded headers are honored. (Safe because the
    // platform strips inbound X-Forwarded-* from clients.)
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("WebApiDatabase")));

// Add environment and production JSON config support
builder.Configuration
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

// API keys are loaded from configuration — do not log them

var allowedOrigins = builder.Configuration["App:AllowedOrigins"]?.Split(',', StringSplitOptions.TrimEntries) ?? ["http://localhost:3000"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.Configure<CloudflareR2Options>(
    builder.Configuration.GetSection("CloudflareR2"));

builder.Services.AddSingleton<IAmazonS3>(sp =>
{
    var options = builder.Configuration.GetSection("CloudflareR2").Get<CloudflareR2Options>()!;
    var config = new AmazonS3Config
    {
        ServiceURL = $"https://{options.AccountId}.r2.cloudflarestorage.com",
        ForcePathStyle = true
    };

    return new AmazonS3Client(
        new BasicAWSCredentials(options.AccessKeyId, options.SecretAccessKey),
        config
    );
});

var jwtKey = builder.Configuration["Jwt:Key"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            ),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddHttpClient();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";

        // Auth endpoints: strict limit (10/min)
        if (path.Contains("/auth/"))
        {
            return RateLimitPartition.GetFixedWindowLimiter($"auth_{ip}", _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
            });
        }

        // General: 100/min per IP
        return RateLimitPartition.GetFixedWindowLimiter($"general_{ip}", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1),
        });
    });

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"message\":\"Too many requests. Please try again later.\"}",
            cancellationToken);
    };
});
builder.Services.AddSingleton<OpenAIService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddHttpClient<PushNotificationService>();
builder.Services.AddScoped<YelpImportService>();
builder.Services.AddScoped<YelpDatasetImportService>();
builder.Services.AddScoped<OpenStreetMapImportService>();
builder.Services.AddHostedService<YelpImportBackgroundJob>();

var app = builder.Build();

// Auto-run SQL migrations on startup
{
    var startupLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup.Migrations");
    var connectionString = app.Configuration.GetConnectionString("WebApiDatabase");
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        // Resolve the sql/ folder whether we're running from a dev bin/ output
        // (sql lives up the tree) or a published image (sql is copied next to
        // the dll via the .csproj Content include). First match wins.
        var sqlCandidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "sql"),
            Path.Combine(app.Environment.ContentRootPath, "sql"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "sql"),
        };
        var sqlDir = sqlCandidates.FirstOrDefault(Directory.Exists) ?? sqlCandidates[0];
        var migrationFile = Path.Combine(sqlDir, "migrate_new_features.sql");

        if (File.Exists(migrationFile))
        {
            try
            {
                await using var conn = new Npgsql.NpgsqlConnection(connectionString);
                await conn.OpenAsync();
                var sql = await File.ReadAllTextAsync(migrationFile);
                await using var cmd = new Npgsql.NpgsqlCommand(sql, conn);
                await cmd.ExecuteNonQueryAsync();
                startupLogger.LogInformation("Migration applied: migrate_new_features.sql");
            }
            catch (Exception ex)
            {
                // Non-fatal so the app can still boot, but log loudly — a failed
                // prod migration must be visible, not swallowed as a "note".
                startupLogger.LogError(ex, "Migration FAILED: migrate_new_features.sql. The database schema may be inconsistent.");
            }
        }
        else
        {
            startupLogger.LogWarning("Migration file not found at {Path}. Skipping startup migration.", migrationFile);
        }

        // Seed demo data — only in Development
        if (!app.Environment.IsProduction())
        {
            var seedFile = Path.Combine(sqlDir, "seed_demo_data.sql");
            if (File.Exists(seedFile))
            {
                try
                {
                    await using var conn2 = new Npgsql.NpgsqlConnection(connectionString);
                    await conn2.OpenAsync();

                    var seedSql = await File.ReadAllTextAsync(seedFile);
                    await using var seedCmd = new Npgsql.NpgsqlCommand(seedSql, conn2);
                    await seedCmd.ExecuteNonQueryAsync();
                }
                catch (Exception ex)
                {
                    startupLogger.LogWarning(ex, "Demo seed note (non-Production only).");
                }
            }
        }
    }
}

// Honor proxy headers first so downstream middleware sees the real client IP/scheme.
app.UseForwardedHeaders();

// Global exception handler: log the real error server-side, return a generic
// ProblemDetails to the client. Prevents leaking ex.Message / SQL / stack detail.
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("UnhandledException");
        logger.LogError(feature?.Error, "Unhandled exception on {Path}", feature?.Path);

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred. Please try again later." });
    });
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

// Baseline security headers on every response.
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["X-XSS-Protection"] = "0";
    await next();
});

app.UseCors("Frontend");

// Lightweight liveness + DB readiness probes for the load balancer / platform.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/health/db", async (IConfiguration cfg) =>
{
    try
    {
        var cs = cfg.GetConnectionString("WebApiDatabase");
        await using var c = new Npgsql.NpgsqlConnection(cs);
        await c.OpenAsync();
        await using var cmd = new Npgsql.NpgsqlCommand("SELECT 1", c);
        await cmd.ExecuteScalarAsync();
        return Results.Ok(new { status = "ok", database = "reachable" });
    }
    catch
    {
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }
});

// Ensure CORS headers are present on all responses, including 401/500
app.Use(async (context, next) =>
{
    await next();

    // If CORS headers are missing on an error response, re-apply them
    if (context.Response.StatusCode >= 400 &&
        !context.Response.Headers.ContainsKey("Access-Control-Allow-Origin"))
    {
        var origin = context.Request.Headers.Origin.ToString();
        if (!string.IsNullOrEmpty(origin) && allowedOrigins.Contains(origin))
        {
            context.Response.Headers.Append("Access-Control-Allow-Origin", origin);
            context.Response.Headers.Append("Access-Control-Allow-Headers", "*");
            context.Response.Headers.Append("Access-Control-Allow-Methods", "*");
        }
    }
});

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public class CloudflareR2Options
{
    public string AccountId { get; set; } = "";
    public string AccessKeyId { get; set; } = "";
    public string SecretAccessKey { get; set; } = "";
    public string BucketName { get; set; } = "";
    public string PublicBaseUrl { get; set; } = "";
}