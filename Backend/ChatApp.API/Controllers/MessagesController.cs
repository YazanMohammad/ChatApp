using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ChatApp.API.Hubs;
using ChatApp.API.Models;
using ChatApp.API.Repositories;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/messages")]
public class MessagesController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IHubContext<ChatHub> _hubContext;

    public MessagesController(
        IUserRepository userRepository,
        IMessageRepository messageRepository,
        IHubContext<ChatHub> hubContext)
    {
        _userRepository = userRepository;
        _messageRepository = messageRepository;
        _hubContext = hubContext;
    }

    [HttpGet]
    public IActionResult GetMessages([FromQuery] long since = 0)
    {
        var user = GetAuthenticatedUser();
        if (user == null)
            return Unauthorized(new { error = "Not authenticated" });

        var messages = since > 0
            ? _messageRepository.GetMessagesSince(since)
            : _messageRepository.GetRecent(50);

        return Ok(messages);
    }

    [HttpPost]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageApiRequest request)
    {
        var user = GetAuthenticatedUser();
        if (user == null)
            return Unauthorized(new { error = "Not authenticated" });

        if (string.IsNullOrWhiteSpace(request?.Message))
            return BadRequest(new { error = "Message required" });

        var trimmed = request.Message.Trim();
        if (trimmed.Length > 500)
            trimmed = trimmed.Substring(0, 500);

        var chatMessage = new ChatMessage
        {
            Id = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N").Substring(0, 6)}",
            Username = user.Username,
            Message = trimmed,
            Timestamp = DateTime.UtcNow
        };

        _messageRepository.Add(chatMessage);

        // Broadcast to SignalR clients as well
        await _hubContext.Clients.All.SendAsync("ReceiveMessage", chatMessage);

        return StatusCode(201, chatMessage);
    }

    private User? GetAuthenticatedUser()
    {
        var token = Request.Cookies["chat_session"];
        if (string.IsNullOrEmpty(token)) return null;
        return _userRepository.GetUserBySessionToken(token);
    }
}

public class SendMessageApiRequest
{
    public string? Message { get; set; }
}
