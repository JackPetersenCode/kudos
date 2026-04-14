namespace Kudos.Server.Data
{
    public class CreateReviewRequest
    {
        public int Rating { get; set; }
        public string? Title { get; set; }
        public string? Body { get; set; }

        public List<string>? PositiveTags { get; set; }
    }
}