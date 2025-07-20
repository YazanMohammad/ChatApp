namespace ChatApp.API.Models;

public class IPAttemptTracker
{
    public string IPAddress { get; set; } = string.Empty;
    public List<DateTime> AttemptTimes { get; set; } = new();
    public DateTime? BlockedUntil { get; set; }
}