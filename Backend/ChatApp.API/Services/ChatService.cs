using ChatApp.API.Models;
using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace ChatApp.API.Services;

public class ChatService
{
    private readonly ConcurrentDictionary<string, User> _connectedUsers = new();
    private readonly ConcurrentDictionary<string, User> _registeredUsers = new();
    private readonly ConcurrentDictionary<string, IPAttemptTracker> _ipAttempts = new();
    private readonly List<ChatMessage> _messages = new();
    private readonly object _messagesLock = new();
    private readonly string[] _colors = { "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F" };
    
    // Security constants
    private const int MAX_FAILED_ATTEMPTS = 5;
    private const int LOCKOUT_MINUTES = 15;
    private const int IP_RATE_LIMIT_ATTEMPTS = 10;
    private const int IP_RATE_LIMIT_MINUTES = 5;

    public AuthResponse AuthenticateUser(string username, string password, bool isNewUser, string? clientIP = null)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Username and password are required" 
            };
        }

        username = username.Trim().ToLower();
        
        var ipCheck = CheckIPRateLimit(clientIP);
        if (!ipCheck.Success)
        {
            return ipCheck;
        }

        if (isNewUser)
        {
            var passwordValidation = ValidatePasswordStrength(password);
            if (!passwordValidation.Success)
            {
                RecordFailedAttempt(clientIP, username);
                return passwordValidation;
            }
        }

        if (!IsValidUsername(username))
        {
            RecordFailedAttempt(clientIP, username);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Username must be 2-20 characters, letters, numbers, underscore, hyphen only" 
            };
        }

        AuthResponse result;
        if (isNewUser)
        {
            result = RegisterUser(username, password);
        }
        else
        {
            result = LoginUser(username, password);
        }

        if (result.Success)
        {
            ClearFailedAttempts(clientIP, username);
        }
        else
        {
            RecordFailedAttempt(clientIP, username);
        }

        return result;
    }

    private AuthResponse CheckIPRateLimit(string? clientIP)
    {
        if (string.IsNullOrEmpty(clientIP)) return new AuthResponse { Success = true };

        var now = DateTime.UtcNow;
        
        if (!_ipAttempts.TryGetValue(clientIP, out var tracker))
        {
            tracker = new IPAttemptTracker { IPAddress = clientIP };
            _ipAttempts.TryAdd(clientIP, tracker);
        }

        if (tracker.BlockedUntil.HasValue && tracker.BlockedUntil > now)
        {
            var remainingSeconds = (int)(tracker.BlockedUntil.Value - now).TotalSeconds;
            return new AuthResponse 
            { 
                Success = false, 
                Message = $"Too many failed attempts. Try again in {remainingSeconds} seconds.",
                RetryAfterSeconds = remainingSeconds
            };
        }

        var cutoffTime = now.AddMinutes(-IP_RATE_LIMIT_MINUTES);
        tracker.AttemptTimes = tracker.AttemptTimes.Where(t => t > cutoffTime).ToList();

        if (tracker.AttemptTimes.Count >= IP_RATE_LIMIT_ATTEMPTS)
        {
            tracker.BlockedUntil = now.AddMinutes(IP_RATE_LIMIT_MINUTES);
            return new AuthResponse 
            { 
                Success = false, 
                Message = $"Too many attempts from your IP. Try again in {IP_RATE_LIMIT_MINUTES} minutes.",
                RetryAfterSeconds = IP_RATE_LIMIT_MINUTES * 60
            };
        }

        return new AuthResponse { Success = true };
    }

    private AuthResponse ValidatePasswordStrength(string password)
    {
        if (password.Length < 6)
        {
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Password must be at least 6 characters long" 
            };
        }

        if (password.Length > 100)
        {
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Password must be less than 100 characters" 
            };
        }

        if (!Regex.IsMatch(password, @"^(?=.*[a-zA-Z])(?=.*\d).+$"))
        {
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Password must contain at least one letter and one number" 
            };
        }

        var weakPasswords = new[] { "123456", "password", "123456789", "12345678", "12345", "1234567", "qwerty", "abc123" };
        if (weakPasswords.Contains(password.ToLower()))
        {
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Password is too common. Please choose a stronger password." 
            };
        }

        return new AuthResponse { Success = true };
    }

    private bool IsValidUsername(string username)
    {
        return username.Length >= 2 && 
               username.Length <= 20 && 
               Regex.IsMatch(username, @"^[a-zA-Z0-9_-]+$");
    }

    private AuthResponse RegisterUser(string username, string password)
    {
        if (_registeredUsers.ContainsKey(username))
        {
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Username already exists. Try logging in instead." 
            };
        }

        var user = new User
        {
            Username = username,
            PasswordHash = HashPassword(password),
            JoinedAt = DateTime.UtcNow,
            LastSeen = DateTime.UtcNow,
            IsOnline = false,
            DisplayColor = _colors[Math.Abs(username.GetHashCode()) % _colors.Length],
            FailedLoginAttempts = 0
        };

        _registeredUsers.TryAdd(username, user);

        return new AuthResponse 
        { 
            Success = true, 
            Message = "Account created successfully!",
            User = user
        };
    }

    private AuthResponse LoginUser(string username, string password)
    {
        if (!_registeredUsers.TryGetValue(username, out var user))
        {
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Username not found. Try creating a new account." 
            };
        }

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

        if (!VerifyPassword(password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            user.LastFailedAttempt = DateTime.UtcNow;

            if (user.FailedLoginAttempts >= MAX_FAILED_ATTEMPTS)
            {
                user.LockoutUntil = DateTime.UtcNow.AddMinutes(LOCKOUT_MINUTES);
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = $"Too many failed attempts. Account locked for {LOCKOUT_MINUTES} minutes.",
                    RetryAfterSeconds = LOCKOUT_MINUTES * 60,
                    IsLocked = true
                };
            }

            var remainingAttempts = MAX_FAILED_ATTEMPTS - user.FailedLoginAttempts;
            return new AuthResponse 
            { 
                Success = false, 
                Message = $"Incorrect password. {remainingAttempts} attempts remaining before lockout." 
            };
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

    private void RecordFailedAttempt(string? clientIP, string username)
    {
        if (!string.IsNullOrEmpty(clientIP))
        {
            if (!_ipAttempts.TryGetValue(clientIP, out var tracker))
            {
                tracker = new IPAttemptTracker { IPAddress = clientIP };
                _ipAttempts.TryAdd(clientIP, tracker);
            }
            tracker.AttemptTimes.Add(DateTime.UtcNow);
        }
    }

    private void ClearFailedAttempts(string? clientIP, string username)
    {
        if (!string.IsNullOrEmpty(clientIP) && _ipAttempts.TryGetValue(clientIP, out var tracker))
        {
            tracker.AttemptTimes.Clear();
            tracker.BlockedUntil = null;
        }
    }

    public void SetUserOnline(string username, string connectionId)
    {
        if (_registeredUsers.TryGetValue(username.ToLower(), out var user))
        {
            user.IsOnline = true;
            user.ConnectionId = connectionId;
            user.LastSeen = DateTime.UtcNow;
            
            _connectedUsers.TryAdd(connectionId, user);
        }
    }

    public void SetUserOffline(string connectionId)
    {
        if (_connectedUsers.TryRemove(connectionId, out var user))
        {
            if (_registeredUsers.TryGetValue(user.Username.ToLower(), out var registeredUser))
            {
                registeredUser.IsOnline = false;
                registeredUser.LastSeen = DateTime.UtcNow;
            }
        }
    }

    public User? GetUserByConnectionId(string connectionId)
    {
        _connectedUsers.TryGetValue(connectionId, out var user);
        return user;
    }

    public List<User> GetOnlineUsers()
    {
        return _connectedUsers.Values
            .Where(u => u.IsOnline)
            .OrderBy(u => u.Username)
            .ToList();
    }

    public List<string> GetOnlineUsernames()
    {
        return GetOnlineUsers().Select(u => u.Username).ToList();
    }

    private string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var saltedPassword = password + "ChatAppSalt2024#SecureHash!";
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(saltedPassword));
        return Convert.ToBase64String(hashedBytes);
    }

    private bool VerifyPassword(string password, string hash)
    {
        return HashPassword(password) == hash;
    }

    public void AddMessage(ChatMessage message)
    {
        lock (_messagesLock)
        {
            _messages.Add(message);
            
            if (_messages.Count > 1000)
            {
                _messages.RemoveRange(0, _messages.Count - 1000);
            }
        }
    }

    public List<ChatMessage> GetRecentMessages(int count = 50)
    {
        lock (_messagesLock)
        {
            return _messages
                .TakeLast(count)
                .OrderBy(m => m.Timestamp)
                .ToList();
        }
    }

    public int GetRegisteredUserCount()
    {
        return _registeredUsers.Count;
    }

    public int GetOnlineUserCount()
    {
        return _connectedUsers.Count;
    }
}