using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Stripe;

namespace Kudos.Server.Controllers
{
    /// <summary>
    /// Receives Stripe webhook events (called by Stripe, not the browser — no JWT).
    /// Verifies the signature, then reconciles ad/payment state for out-of-band
    /// events (failed captures, disputes, refunds) that the synchronous request
    /// flow can't observe. Configure the endpoint in the Stripe dashboard and set
    /// Stripe:WebhookSecret. Always returns 200 on handled events so Stripe stops retrying.
    /// </summary>
    [ApiController]
    [Route("api/stripe/webhook")]
    [AllowAnonymous]
    public class StripeWebhookController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<StripeWebhookController> _logger;

        public StripeWebhookController(IConfiguration configuration, ILogger<StripeWebhookController> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Handle()
        {
            var webhookSecret = _configuration["Stripe:WebhookSecret"];
            if (string.IsNullOrWhiteSpace(webhookSecret))
            {
                _logger.LogError("Stripe webhook received but Stripe:WebhookSecret is not configured.");
                return StatusCode(500);
            }

            var json = await new StreamReader(Request.Body).ReadToEndAsync();

            Event stripeEvent;
            try
            {
                stripeEvent = EventUtility.ConstructEvent(
                    json,
                    Request.Headers["Stripe-Signature"],
                    webhookSecret);
            }
            catch (StripeException ex)
            {
                // Signature verification failed — reject (could be a forged request).
                _logger.LogWarning(ex, "Stripe webhook signature verification failed.");
                return BadRequest();
            }

            try
            {
                switch (stripeEvent.Type)
                {
                    case "payment_intent.payment_failed":
                    case "payment_intent.canceled":
                        if (stripeEvent.Data.Object is PaymentIntent failedPi)
                            await PauseAdForPaymentIntent(failedPi.Id, stripeEvent.Type);
                        break;

                    case "charge.dispute.created":
                        if (stripeEvent.Data.Object is Dispute dispute)
                            await PauseAdForPaymentIntent(dispute.PaymentIntentId, stripeEvent.Type);
                        break;

                    case "charge.refunded":
                        if (stripeEvent.Data.Object is Charge charge)
                            await PauseAdForPaymentIntent(charge.PaymentIntentId, stripeEvent.Type);
                        break;

                    default:
                        _logger.LogInformation("Unhandled Stripe event type {Type}", stripeEvent.Type);
                        break;
                }
            }
            catch (Exception ex)
            {
                // Log but still 200 — Stripe will otherwise retry indefinitely.
                // The event id is logged so it can be replayed/reconciled manually.
                _logger.LogError(ex, "Error handling Stripe event {EventId} ({Type})", stripeEvent.Id, stripeEvent.Type);
            }

            return Ok();
        }

        /// <summary>
        /// Pause any ad whose campaign is tied to this PaymentIntent so an ad that
        /// failed payment / was disputed / refunded stops serving.
        /// </summary>
        private async Task PauseAdForPaymentIntent(string? paymentIntentId, string reason)
        {
            if (string.IsNullOrWhiteSpace(paymentIntentId)) return;

            var connectionString = _configuration.GetConnectionString("WebApiDatabase");
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            var sql = """
                UPDATE ads
                SET status = 'paused', updated_at_utc = @now
                WHERE id IN (
                    SELECT a.id FROM ads a
                    INNER JOIN ad_campaigns ac ON ac.ad_id = a.id
                    WHERE ac.stripe_payment_intent_id = @pi_id
                )
                AND status = 'active';
                """;

            await using var cmd = new NpgsqlCommand(sql, connection);
            cmd.Parameters.AddWithValue("@pi_id", paymentIntentId);
            cmd.Parameters.AddWithValue("@now", DateTime.UtcNow);
            var affected = await cmd.ExecuteNonQueryAsync();

            _logger.LogWarning("Stripe {Reason}: paused {Count} ad(s) for payment intent {PaymentIntentId}", reason, affected, paymentIntentId);
        }
    }
}
