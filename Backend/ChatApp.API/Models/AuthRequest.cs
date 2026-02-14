namespace ChatApp.API.Models;

public class AuthRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool IsNewUser { get; set; }
    public string? ClientIP { get; set; }
}