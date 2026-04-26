namespace Kudos.Server.Data
{
    public class CreateStaffMemberRequest
    {
        public string FirstName { get; set; } = "";
        public string LastName { get; set; } = "";
        public string? Role { get; set; }
        public string? PhotoUrl { get; set; }
    }
}
