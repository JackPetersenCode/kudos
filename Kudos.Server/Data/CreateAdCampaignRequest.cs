namespace Kudos.Server.Data
{
    public class CreateAdCampaignRequest
    {
        public DateTime StartAtUtc { get; set; }
        public DateTime EndAtUtc { get; set; }
        public int BudgetCents { get; set; }
        public string PricingModel { get; set; } = "flat";
        public int? BidCents { get; set; }
        public List<string> PlacementSlugs { get; set; } = new();
        public string? CategorySlug { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
    }
}