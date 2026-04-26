using SendGrid;
using SendGrid.Helpers.Mail;

namespace Kudos.Server.Services
{
    public class EmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendAsync(string toEmail, string subject, string htmlBody)
        {
            var apiKey = _configuration["SendGrid:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                // Fallback: log to console in development
                _logger.LogWarning("SendGrid not configured. Email logged to console.");
                Console.WriteLine($"=== EMAIL ===");
                Console.WriteLine($"To: {toEmail}");
                Console.WriteLine($"Subject: {subject}");
                Console.WriteLine($"Body: {htmlBody}");
                Console.WriteLine($"=============");
                return;
            }

            var client = new SendGridClient(apiKey);
            var fromEmail = _configuration["SendGrid:FromEmail"] ?? "noreply@kudos.app";
            var fromName = _configuration["SendGrid:FromName"] ?? "Reputater";

            var msg = MailHelper.CreateSingleEmail(
                new EmailAddress(fromEmail, fromName),
                new EmailAddress(toEmail),
                subject,
                null,
                htmlBody
            );

            var response = await client.SendEmailAsync(msg);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Body.ReadAsStringAsync();
                _logger.LogError("SendGrid failed: {StatusCode} {Body}", response.StatusCode, body);
            }
        }

        public async Task SendVerificationEmail(string toEmail, string verificationUrl)
        {
            var html = $"""
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #1a1a2e;">Verify Your Email</h2>
                    <p>Thanks for signing up for Reputater! Click the button below to verify your email address.</p>
                    <a href="{verificationUrl}" style="display: inline-block; background: #e94560; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Verify Email</a>
                    <p style="color: #666; margin-top: 24px; font-size: 13px;">If you didn't create this account, you can ignore this email.</p>
                </div>
                """;

            await SendAsync(toEmail, "Verify your Reputater account", html);
        }

        public async Task SendPasswordResetEmail(string toEmail, string resetUrl)
        {
            var html = $"""
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #1a1a2e;">Reset Your Password</h2>
                    <p>Click the button below to reset your password. This link expires in 1 hour.</p>
                    <a href="{resetUrl}" style="display: inline-block; background: #e94560; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
                    <p style="color: #666; margin-top: 24px; font-size: 13px;">If you didn't request this, you can ignore this email.</p>
                </div>
                """;

            await SendAsync(toEmail, "Reset your Reputater password", html);
        }

        public async Task SendClaimVerificationCode(string toEmail, string code)
        {
            var html = $"""
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #1a1a2e;">Business Claim Verification</h2>
                    <p>Your verification code is:</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 0.2em; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center; margin: 16px 0;">{code}</div>
                    <p>This code expires in 30 minutes.</p>
                    <p style="color: #666; font-size: 13px;">If you didn't request this, someone may be trying to claim your business on Reputater.</p>
                </div>
                """;

            await SendAsync(toEmail, "Your Reputater verification code", html);
        }

        public async Task SendNotification(string toEmail, string subject, string message)
        {
            var html = $"""
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #1a1a2e;">{subject}</h2>
                    <p>{message}</p>
                    <a href="{_configuration["App:FrontendUrl"] ?? "http://localhost:3000"}/dashboard/notifications" style="display: inline-block; background: #1a1a2e; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">View on Reputater</a>
                </div>
                """;

            await SendAsync(toEmail, subject, html);
        }
    }
}
