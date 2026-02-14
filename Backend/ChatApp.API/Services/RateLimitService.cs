using System.Collections.Concurrent;
using ChatApp.API.Models;

namespace ChatApp.API.Services;

public class RateLimitService : IRateLimitService
{
    private const int MaxAttempts = 10;
    private const int WindowMinutes = 5;

    private readonly ConcurrentDictionary<string, IPAttemptTracker> _ipAttempts = new();

    public AuthResponse CheckIPRateLimit(string? clientIP)
    {
        if (string.IsNullOrEmpty(clientIP))
            return AuthResponse.Ok();

        var now = DateTime.UtcNow;
        var tracker = _ipAttempts.GetOrAdd(clientIP, _ => new IPAttemptTracker { IPAddress = clientIP });

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

        var cutoffTime = now.AddMinutes(-WindowMinutes);
        tracker.AttemptTimes = tracker.AttemptTimes.Where(t => t > cutoffTime).ToList();

        if (tracker.AttemptTimes.Count >= MaxAttempts)
        {
            tracker.BlockedUntil = now.AddMinutes(WindowMinutes);
            return new AuthResponse
            {
                Success = false,
                Message = $"Too many attempts from your IP. Try again in {WindowMinutes} minutes.",
                RetryAfterSeconds = WindowMinutes * 60
            };
        }

        return AuthResponse.Ok();
    }

    public void RecordFailedAttempt(string? clientIP)
    {
        if (string.IsNullOrEmpty(clientIP)) return;

        var tracker = _ipAttempts.GetOrAdd(clientIP, _ => new IPAttemptTracker { IPAddress = clientIP });
        tracker.AttemptTimes.Add(DateTime.UtcNow);
    }

    public void ClearFailedAttempts(string? clientIP)
    {
        if (!string.IsNullOrEmpty(clientIP) && _ipAttempts.TryGetValue(clientIP, out var tracker))
        {
            tracker.AttemptTimes.Clear();
            tracker.BlockedUntil = null;
        }
    }
}
