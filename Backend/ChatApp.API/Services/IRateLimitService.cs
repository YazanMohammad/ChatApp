using ChatApp.API.Models;

namespace ChatApp.API.Services;

/// <summary>
/// Tracks failed authentication attempts per IP and enforces rate limits.
/// </summary>
public interface IRateLimitService
{
    AuthResponse CheckIPRateLimit(string? clientIP);
    void RecordFailedAttempt(string? clientIP);
    void ClearFailedAttempts(string? clientIP);
}
