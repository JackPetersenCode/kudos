using System.Text;
using System.Threading.RateLimiting;
using Amazon.Runtime;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Kudos.Server.Data;
using Kudos.Server.Services;
DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

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
builder.Services.AddScoped<YelpImportService>();
builder.Services.AddScoped<YelpDatasetImportService>();
builder.Services.AddScoped<OpenStreetMapImportService>();
builder.Services.AddHostedService<YelpImportBackgroundJob>();

var app = builder.Build();

// Auto-run SQL migrations on startup
{
    var connectionString = app.Configuration.GetConnectionString("WebApiDatabase");
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        var sqlDir = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "sql");
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
                Console.WriteLine("Migration applied: migrate_new_features.sql");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Migration note: {ex.Message}");
            }
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
                    Console.WriteLine($"Seed note: {ex.Message}");
                }
            }
        }
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");

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