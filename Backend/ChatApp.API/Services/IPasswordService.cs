using ChatApp.API.Models;

namespace ChatApp.API.Services;

/// <summary>
/// Handles password hashing, verification, and strength validation.
/// </summary>
public interface IPasswordService
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
    AuthResponse ValidatePasswordStrength(string password);
}
