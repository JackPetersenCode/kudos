namespace Kudos.Server.Data
{
    public class BusinessHourInput
    {
        public short DayOfWeek { get; set; }   // 0=Sunday, 6=Saturday
        public string? OpenTime { get; set; }  // "09:00"
        public string? CloseTime { get; set; } // "17:00"
        public bool IsClosed { get; set; }
    }
}