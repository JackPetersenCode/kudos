using OpenAI.Chat;

namespace Kudos.Server.Services
{
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