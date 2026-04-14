namespace Kudos.Server.Data
{
    public class UpdateBusinessRequest
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public string? Phone { get; set; }
        public string? WebsiteUrl { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? PostalCode { get; set; }

        public List<string>? CategorySlugs { get; set; }

        public short? PriceLevel { get; set; }
        public bool AcceptsReservations { get; set; }
        public bool OffersOnlineWaitlist { get; set; }
        public bool OffersDelivery { get; set; }
        public bool OffersTakeout { get; set; }
        public bool OutdoorSeating { get; set; }

        public string TimeZone { get; set; } = "America/Chicago";
    }
}