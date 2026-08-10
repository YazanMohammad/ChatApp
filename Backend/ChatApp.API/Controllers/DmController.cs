using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ChatApp.API.Hubs;
using ChatApp.API.Models;
using ChatApp.API.Repositories;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/dm")]
public class DmController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IHubContext<ChatHub> _hubContext;

    public DmController(
        IUserRepository userRepository,
        IMessageRepository messageRepository,
        IHubContext<ChatHub> hubContext)
    {
        _userRepository = userRepository;
        _messageRepository = messageRepository;
        _hubContext = hubContext;
    }

    [HttpGet]
    public IActionResult GetPrivateMessages([FromQuery] string? with, [FromQuery] long since = 0)
    {
        var user = GetAuthenticatedUser();
        if (user == null)
            return Unauthorized(new { error = "Not authenticated" });

        if (string.IsNullOrWhiteSpace(with))
            return BadRequest(new { error = "Missing 'with' query param" });

        var messages = _messageRepository.GetPrivateMessagesSince(user.Username, with, since);
        return Ok(messages);
    }

    [HttpPost]
    public async Task<IActionResult> SendPrivateMessage([FromBody] SendDmApiRequest request)
    {
        var user = GetAuthenticatedUser();
        if (user == null)
            return Unauthorized(new { error = "Not authenticated" });

        if (string.IsNullOrWhiteSpace(request?.Recipient) || string.IsNullOrWhiteSpace(request?.Message))
            return BadRequest(new { error = "Recipient and message required" });

        var recipientUser = _userRepository.GetByUsername(request.Recipient);
        if (recipientUser == null)
            return NotFound(new { error = "Recipient not found" });

        var trimmed = request.Message.Trim();
        if (trimmed.Length > 500)
            trimmed = trimmed.Substring(0, 500);

        var chatMessage = new ChatMessage
        {
            Id = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N").Substring(0, 6)}",
            Username = user.Username,
            Recipient = recipientUser.Username,
            Message = trimmed,
            Timestamp = DateTime.UtcNow
        };

        _messageRepository.AddPrivate(chatMessage);

        // Broadcast to SignalR client if recipient is connected via SignalR
        if (recipientUser.IsOnline && !string.IsNullOrEmpty(recipientUser.ConnectionId))
        {
            await _hubContext.Clients.Client(recipientUser.ConnectionId).SendAsync("ReceivePrivateMessage", chatMessage);
        }

        return StatusCode(201, chatMessage);
    }

    private User? GetAuthenticatedUser()
    {
        var token = Request.Cookies["chat_session"];
        if (string.IsNullOrEmpty(token)) return null;
        return _userRepository.GetUserBySessionToken(token);
    }
}

public class SendDmApiRequest
{
    public string? Recipient { get; set; }
    public string? Message { get; set; }
}
