using ChatApp.API.Models;
using ChatApp.API.Repositories;

namespace ChatApp.API.Services;

public class AuthenticationService : IAuthenticationService
{
    private const int MaxFailedAttempts = 5;
    private const int LockoutMinutes = 15;

    private readonly IPasswordService _passwordService;
    private readonly IRateLimitService _rateLimitService;
    private readonly IUserRepository _userRepository;

    public AuthenticationService(
        IPasswordService passwordService,
        IRateLimitService rateLimitService,
        IUserRepository userRepository)
    {
        _passwordService = passwordService;
        _rateLimitService = rateLimitService;
        _userRepository = userRepository;
    }

    public AuthResponse Authenticate(string username, string password, bool isNewUser, string? clientIP)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return AuthResponse.Failure("Username and password are required");

        username = username.Trim().ToLower();

        var ipCheck = _rateLimitService.CheckIPRateLimit(clientIP);
        if (!ipCheck.Success)
            return ipCheck;

        if (!_userRepository.IsValidUsername(username))
        {
            _rateLimitService.RecordFailedAttempt(clientIP);
            return AuthResponse.Failure("Username must be 2-20 characters, letters, numbers, underscore, hyphen only");
        }

        if (isNewUser)
        {
            var passwordCheck = _passwordService.ValidatePasswordStrength(password);
            if (!passwordCheck.Success)
            {
                _rateLimitService.RecordFailedAttempt(clientIP);
                return passwordCheck;
            }
        }

        var result = isNewUser
            ? RegisterUser(username, password)
            : LoginUser(username, password);

        if (result.Success)
            _rateLimitService.ClearFailedAttempts(clientIP);
        else
            _rateLimitService.RecordFailedAttempt(clientIP);

        return result;
    }

    private AuthResponse RegisterUser(string username, string password)
    {
        if (_userRepository.UserExists(username))
            return AuthResponse.Failure("Username already exists. Try logging in instead.");

        var user = new User
        {
            Username = username,
            PasswordHash = _passwordService.HashPassword(password),
            JoinedAt = DateTime.UtcNow,
            LastSeen = DateTime.UtcNow,
            IsOnline = false,
            FailedLoginAttempts = 0
        };

        _userRepository.Register(user);

        return new AuthResponse
        {
            Success = true,
            Message = "Account created successfully!",
            User = user
        };
    }

    private AuthResponse LoginUser(string username, string password)
    {
        var user = _userRepository.GetByUsername(username);
        if (user == null)
            return AuthResponse.Failure("Username not found. Try creating a new account.");

        if (user.LockoutUntil.HasValue && user.LockoutUntil > DateTime.UtcNow)
        {
            var remainingSeconds = (int)(user.LockoutUntil.Value - DateTime.UtcNow).TotalSeconds;
            return new AuthResponse
            {
                Success = false,
                Message = $"Account temporarily locked. Try again in {remainingSeconds} seconds.",
                RetryAfterSeconds = remainingSeconds,
                IsLocked = true
            };
        }

        if (!_passwordService.VerifyPassword(password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            user.LastFailedAttempt = DateTime.UtcNow;

            if (user.FailedLoginAttempts >= MaxFailedAttempts)
            {
                user.LockoutUntil = DateTime.UtcNow.AddMinutes(LockoutMinutes);
                return new AuthResponse
                {
                    Success = false,
                    Message = $"Too many failed attempts. Account locked for {LockoutMinutes} minutes.",
                    RetryAfterSeconds = LockoutMinutes * 60,
                    IsLocked = true
                };
            }

            var remaining = MaxFailedAttempts - user.FailedLoginAttempts;
            return AuthResponse.Failure($"Incorrect password. {remaining} attempts remaining before lockout.");
        }

        user.FailedLoginAttempts = 0;
        user.LockoutUntil = null;
        user.LastSeen = DateTime.UtcNow;

        return new AuthResponse
        {
            Success = true,
            Message = "Login successful!",
            User = user
        };
    }
}
