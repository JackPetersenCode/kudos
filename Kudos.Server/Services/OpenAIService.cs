using OpenAI.Chat;

namespace Kudos.Server.Services
{
    public class AdReviewResult
    {
        public string Decision { get; set; } = "approve";
        public string Reason { get; set; } = "";
    }

    public class OpenAIService
    {
        private readonly ChatClient _client;

        public OpenAIService(IConfiguration configuration)
        {
            var apiKey = configuration["OpenAI:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException(
                    "OpenAI API key is not configured. Set OpenAI:ApiKey or OPENAI__ApiKey."
                );
            }

            _client = new ChatClient(model: "gpt-4o", apiKey);
        }

        public async Task<AdReviewResult> ReviewAd(string title, string? headline, string? description, string? imageUrl, string destinationUrl)
        {
            try
            {
                var adContent = $"""
                    Title: {title}
                    Headline: {headline ?? "(none)"}
                    Description: {description ?? "(none)"}
                    Image URL: {imageUrl ?? "(none)"}
                    Destination URL: {destinationUrl}
                    """;

                List<ChatMessage> messages = new()
                {
                    new SystemChatMessage(
                        """
                        You are an ad content moderator for Reputater, a local business review platform.
                        Review the following advertisement and decide whether to APPROVE or REJECT it.

                        Default to APPROVE. Most ads should be approved. Only reject ads that are clearly harmful.

                        REJECT only if:
                        - It contains profanity, slurs, hate speech, or sexually explicit content
                        - It is an obvious scam (e.g., "wire money", "Nigerian prince", fake giveaways)
                        - It promotes illegal drugs, weapons, or illegal services
                        - The destination URL is clearly malicious (e.g., known phishing patterns)

                        APPROVE everything else, including:
                        - Apps, websites, SaaS products, online tools
                        - Local or non-local businesses of any kind
                        - Short or minimal descriptions (not everyone writes long copy)
                        - Promotional language, sales pitches, calls to action
                        - Any legitimate product, service, or brand

                        Respond in exactly this format (two lines only):
                        DECISION: APPROVE or REJECT
                        REASON: One sentence explaining why
                        """
                    ),
                    new UserChatMessage($"Review this ad:\n\n{adContent}")
                };

                var response = await _client.CompleteChatAsync(messages);
                var text = response.Value.Content[0].Text.Trim();

                var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

                var decision = "approve";
                var reason = "Ad content appears appropriate.";

                foreach (var line in lines)
                {
                    if (line.StartsWith("DECISION:", StringComparison.OrdinalIgnoreCase))
                    {
                        var val = line["DECISION:".Length..].Trim().ToLowerInvariant();
                        decision = val.Contains("reject") ? "reject" : "approve";
                    }
                    else if (line.StartsWith("REASON:", StringComparison.OrdinalIgnoreCase))
                    {
                        reason = line["REASON:".Length..].Trim();
                    }
                }

                return new AdReviewResult { Decision = decision, Reason = reason };
            }
            catch (Exception ex)
            {
                // If AI review fails, default to approve (admin can manually reject later)
                Console.WriteLine($"AI ad review failed: {ex.Message}");
                return new AdReviewResult { Decision = "approve", Reason = "Auto-approved (AI review unavailable)." };
            }
        }

        public async Task<string> AnalyzeSentiment(string sentence)
        {
            try
            {
                List<ChatMessage> messages = new()
                {
                    new SystemChatMessage(
                        "You are a sentiment analysis assistant. Respond with exactly one word: 'positive' or 'negative'."
                    ),
                    new UserChatMessage(
                        $"Does the following sentence have a positive or negative connotation?\n\n\"{sentence}\""
                    )
                };

                var response = await _client.CompleteChatAsync(messages);

                var text = response.Value.Content[0].Text.Trim().ToLowerInvariant();

                if (text.Contains("negative"))
                {
                    return "negative";
                }

                if (text.Contains("positive"))
                {
                    return "positive";
                }

                throw new InvalidOperationException("OpenAI returned an unexpected sentiment response.");
            }
            catch (Exception ex)
            {
                throw new SentimentServiceUnavailableException(
                    "Sentiment analysis is temporarily unavailable.",
                    ex
                );
            }
        }
    }
}