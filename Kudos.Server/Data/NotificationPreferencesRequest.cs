namespace Kudos.Server.Data
{
    public class NotificationPreferencesRequest
    {
        public bool EmailOnNewReview { get; set; } = true;
        public bool EmailOnReviewResponse { get; set; } = true;
        public bool EmailOnNewKudos { get; set; } = true;
        public bool EmailOnFavoriteActivity { get; set; } = false;
    }
}
