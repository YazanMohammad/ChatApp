// Models/User.cs
namespace ChatApp.API.Models;

public class User
{
    public string ConnectionId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
    public DateTime LastSeen { get; set; }
    public bool IsOnline { get; set; }
    public string DisplayColor { get; set; } = string.Empty;
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockoutUntil { get; set; }
    public DateTime? LastFailedAttempt { get; set; }
}