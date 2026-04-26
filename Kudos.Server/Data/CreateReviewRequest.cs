namespace Kudos.Server.Data
{
    public class CreateReviewRequest
    {
        public int Rating { get; set; }
        public string? Title { get; set; }
        public string? Body { get; set; }
        public List<string>? PositiveTags { get; set; }
        public List<ReviewPhotoInput>? Photos { get; set; }

        // for edit mode
        public List<Guid>? DeletePhotoIds { get; set; }

        // staff recognitions
        public List<StaffRecognitionInput>? StaffRecognitions { get; set; }
    }

    public class StaffRecognitionInput
    {
        public Guid StaffMemberId { get; set; }
        public List<string>? Tags { get; set; }
    }
}