namespace Kudos.Server.Data
{
    public class CompletePhotoUploadRequest
    {
        public string StorageKey { get; set; } = "";
        public string OriginalUrl { get; set; } = "";
        public string? ContentType { get; set; }
        public long? SizeBytes { get; set; }
        public bool IsPrimary { get; set; }
    }
}