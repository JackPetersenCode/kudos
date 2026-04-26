namespace Kudos.Server.Data
{
    public class UpdateAdRequest
    {
        public string Title { get; set; } = "";
        public string? Headline { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string DestinationUrl { get; set; } = "";
        public string Status { get; set; } = "draft";
    }
}