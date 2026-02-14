using ChatApp.API.Models;

namespace ChatApp.API.Services;

/// <summary>
/// Orchestrates user authentication, composing password, rate-limit, and user services.
/// </summary>
public interface IAuthenticationService
{
    AuthResponse Authenticate(string username, string password, bool isNewUser, string? clientIP);
}
