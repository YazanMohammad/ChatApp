using Microsoft.AspNetCore.Mvc;
using ChatApp.API.Models;
using ChatApp.API.Repositories;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;

    public UsersController(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    [HttpGet("users")]
    public IActionResult GetOnlineUsers()
    {
        var user = GetAuthenticatedUser();
        if (user == null)
            return Unauthorized(new { error = "Not authenticated" });

        _userRepository.TouchUser(user.Username);
        _userRepository.PruneOffline(TimeSpan.FromSeconds(15));

        var onlineUsers = _userRepository.GetOnlineUsers()
            .Select(u => new
            {
                username = u.Username,
                displayColor = u.DisplayColor
            });

        return Ok(onlineUsers);
    }

    [HttpPost("heartbeat")]
    public IActionResult Heartbeat()
    {
        var user = GetAuthenticatedUser();
        if (user == null)
            return Unauthorized(new { error = "Not authenticated" });

        _userRepository.TouchUser(user.Username);
        _userRepository.PruneOffline(TimeSpan.FromSeconds(15));

        return Ok(new { ok = true });
    }

    private User? GetAuthenticatedUser()
    {
        var token = Request.Cookies["chat_session"];
        if (string.IsNullOrEmpty(token)) return null;
        return _userRepository.GetUserBySessionToken(token);
    }
}
