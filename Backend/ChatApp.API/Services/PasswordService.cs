using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using ChatApp.API.Models;

namespace ChatApp.API.Services;

public class PasswordService : IPasswordService
{
    private const string Salt = "ChatAppSalt2024#SecureHash!";

    private static readonly string[] WeakPasswords =
    {
        "123456", "password", "123456789", "12345678",
        "12345", "1234567", "qwerty", "abc123"
    };

    public string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var saltedPassword = password + Salt;
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(saltedPassword));
        return Convert.ToBase64String(hashedBytes);
    }

    public bool VerifyPassword(string password, string hash)
    {
        return HashPassword(password) == hash;
    }

    public AuthResponse ValidatePasswordStrength(string password)
    {
        if (password.Length < 6)
            return AuthResponse.Failure("Password must be at least 6 characters long");

        if (password.Length > 100)
            return AuthResponse.Failure("Password must be less than 100 characters");

        if (!Regex.IsMatch(password, @"^(?=.*[a-zA-Z])(?=.*\d).+$"))
            return AuthResponse.Failure("Password must contain at least one letter and one number");

        if (WeakPasswords.Contains(password.ToLower()))
            return AuthResponse.Failure("Password is too common. Please choose a stronger password.");

        return AuthResponse.Ok();
    }
}
                                    