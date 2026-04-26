namespace Kudos.Server.Data
{
    public class ReviewPhotoInput
    {
        public string StorageKey { get; set; } = "";
        public string OriginalUrl { get; set; } = "";
        public string? ContentType { get; set; }
        public long? SizeBytes { get; set; }
    }
}