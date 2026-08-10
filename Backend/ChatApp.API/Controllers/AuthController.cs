using Microsoft.AspNetCore.Mvc;
using ChatApp.API.Models;
using ChatApp.API.Repositories;
using ChatApp.API.Services;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api")]
public class AuthController : ControllerBase
{
    private readonly IAuthenticationService _authService;
    private readonly IUserRepository _userRepository;

    public AuthController(
        IAuthenticationService authService,
        IUserRepository userRepository)
    {
        _authService = authService;
        _userRepository = userRepository;
    }

    [HttpPost("auth")]
    public IActionResult Auth([FromBody] AuthApiRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { success = false, message = "Username and password required" });
        }

        var clientIP = ResolveClientIP();
        var result = _authService.Authenticate(request.Username, request.Password, request.IsNewUser, clientIP);

        if (!result.Success)
        {
            if (result.IsLocked)
            {
                return StatusCode(429, new
                {
                    success = false,
                    message = result.Message,
                    retryAfterSeconds = result.RetryAfterSeconds,
                    isLocked = true
                });
            }

            if (result.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase))
                return Conflict(new { success = false, message = result.Message });

            if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                return NotFound(new { success = false, message = result.Message });

            if (result.Message.Contains("Incorrect password", StringComparison.OrdinalIgnoreCase) ||
                result.Message.Contains("Wrong password", StringComparison.OrdinalIgnoreCase))
                return Unauthorized(new { success = false, message = result.Message });

            return BadRequest(new { success = false, message = result.Message });
        }

        var token = _userRepository.CreateSession(result.User!.Username);

        Response.Cookies.Append("chat_session", token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddDays(1)
        });

        return Ok(new
        {
            success = true,
            message = result.Message,
            user = new
            {
                username = result.User.Username,
                displayColor = result.User.DisplayColor
            }
        });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        var token = Request.Cookies["chat_session"];
        if (!string.IsNullOrEmpty(token))
        {
            _userRepository.RemoveSession(token);
        }

        Response.Cookies.Delete("chat_session", new CookieOptions
        {
            Path = "/",
            SameSite = SameSiteMode.Lax
        });

        return Ok(new { ok = true });
    }

    private string? ResolveClientIP()
    {
        var forwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
            return forwardedFor.Split(',')[0].Trim();

        var realIP = Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIP))
            return realIP;

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}

public class AuthApiRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool IsNewUser { get; set; }
}
