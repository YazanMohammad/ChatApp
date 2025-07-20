namespace ChatApp.API.Models;
public class AuthRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool IsNewUser { get; set; }
    public string? ClientIP { get; set; }
}

public class AuthResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public User? User { get; set; }
    public int? RetryAfterSeconds { get; set; }
    public bool IsLocked { get; set; }
}