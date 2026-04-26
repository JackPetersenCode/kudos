namespace Kudos.Server.Data
{
    public class CreateSeasonalTagRequest
    {
        public string TagName { get; set; } = "";
        public DateTime? ExpiresAtUtc { get; set; }
    }
}
