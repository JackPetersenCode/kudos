namespace Kudos.Server.Services
{
    public class SentimentServiceUnavailableException : Exception
    {
        public SentimentServiceUnavailableException(string message, Exception? innerException = null)
            : base(message, innerException)
        {
        }
    }
}