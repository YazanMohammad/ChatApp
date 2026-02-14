namespace ChatApp.API.Models;

public class AuthResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public User? User { get; set; }
    public int? RetryAfterSeconds { get; set; }
    public bool IsLocked { get; set; }

    /// <summary>Creates a successful response with no message.</summary>
    public static AuthResponse Ok() => new() { Success = true };

    /// <summary>Creates a failure response with the given message.</summary>
    public static AuthResponse Failure(string message) => new() { Success = false, Message = message };
}
