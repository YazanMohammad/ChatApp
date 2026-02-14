using Microsoft.AspNetCore.SignalR;
using ChatApp.API.Models;
using ChatApp.API.Repositories;
using ChatApp.API.Services;

namespace ChatApp.API.Hubs;

public class ChatHub : Hub
{
    private readonly IAuthenticationService _authService;
    private readonly IUserRepository _userRepository;
    private readonly IMessageRepository _messageRepository;

    public ChatHub(
        IAuthenticationService authService,
        IUserRepository userRepository,
        IMessageRepository messageRepository)
    {
        _authService = authService;
        _userRepository = userRepository;
        _messageRepository = messageRepository;
    }

    public async Task<AuthResponse> AuthenticateAndJoin(string username, string password, bool isNewUser)
    {
        var clientIP = ResolveClientIP();
        var authResult = _authService.Authenticate(username, password, isNewUser, clientIP);

        if (authResult.Success && authResult.User != null)
        {
            _userRepository.SetOnline(authResult.User.Username, Context.ConnectionId);

            await Clients.All.SendAsync("UserJoined", authResult.User.Username);
            await Clients.All.SendAsync("UpdateUserList", _userRepository.GetOnlineUsers());
            await Clients.Caller.SendAsync("ChatHistory", _messageRepository.GetRecent(50));
        }

        return authResult;
    }

    public async Task SendMessage(string username, string message)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(message))
            return;

        var user = _userRepository.GetByConnectionId(Context.ConnectionId);
        if (user == null || !string.Equals(user.Username, username, StringComparison.OrdinalIgnoreCase))
            return;

        if (message.Length > 1000)
        {
            await Clients.Caller.SendAsync("Error", "Message too long. Maximum 1000 characters.");
            return;
        }

        var chatMessage = new ChatMessage
        {
            Id = Guid.NewGuid().ToString(),
            Username = user.Username,
            Message = message.Trim(),
            Timestamp = DateTime.UtcNow
        };

        _messageRepository.Add(chatMessage);
        await Clients.All.SendAsync("ReceiveMessage", chatMessage);
    }

    public async Task SendPrivateMessage(string recipient, string message)
    {
        if (string.IsNullOrWhiteSpace(recipient) || string.IsNullOrWhiteSpace(message))
            return;

        var sender = _userRepository.GetByConnectionId(Context.ConnectionId);
        if (sender == null)
            return;

        if (string.Equals(sender.Username, recipient, StringComparison.OrdinalIgnoreCase))
        {
            await Clients.Caller.SendAsync("Error", "You cannot send a message to yourself.");
            return;
        }

        if (message.Length > 1000)
        {
            await Clients.Caller.SendAsync("Error", "Message too long. Maximum 1000 characters.");
            return;
        }

        var recipientUser = _userRepository.GetByUsername(recipient);
        if (recipientUser == null)
        {
            await Clients.Caller.SendAsync("Error", "User not found.");
            return;
        }

        var chatMessage = new ChatMessage
        {
            Id = Guid.NewGuid().ToString(),
            Username = sender.Username,
            Recipient = recipientUser.Username,
            Message = message.Trim(),
            Timestamp = DateTime.UtcNow
        };

        _messageRepository.AddPrivate(chatMessage);

        // Send to sender
        await Clients.Caller.SendAsync("ReceivePrivateMessage", chatMessage);

        // Send to recipient only if they are online
        if (recipientUser.IsOnline && !string.IsNullOrEmpty(recipientUser.ConnectionId))
        {
            await Clients.Client(recipientUser.ConnectionId).SendAsync("ReceivePrivateMessage", chatMessage);
        }
    }

    public async Task GetPrivateHistory(string otherUser)
    {
        var caller = _userRepository.GetByConnectionId(Context.ConnectionId);
        if (caller == null)
            return;

        var history = _messageRepository.GetPrivateMessages(caller.Username, otherUser, 50);
        await Clients.Caller.SendAsync("PrivateHistory", history);
    }

    public async Task LeaveChat(string username)
    {
        _userRepository.SetOffline(Context.ConnectionId);
        await Clients.All.SendAsync("UserLeft", username);
        await Clients.All.SendAsync("UpdateUserList", _userRepository.GetOnlineUsers());
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var user = _userRepository.GetByConnectionId(Context.ConnectionId);
        if (user != null)
        {
            _userRepository.SetOffline(Context.ConnectionId);
            await Clients.All.SendAsync("UserLeft", user.Username);
            await Clients.All.SendAsync("UpdateUserList", _userRepository.GetOnlineUsers());
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Resolves the client IP from proxy headers or the direct connection.
    /// </summary>
    private string? ResolveClientIP()
    {
        try
        {
            var httpContext = Context.GetHttpContext();
            if (httpContext == null) return null;

            var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwardedFor))
                return forwardedFor.Split(',')[0].Trim();

            var realIP = httpContext.Request.Headers["X-Real-IP"].FirstOrDefault();
            if (!string.IsNullOrEmpty(realIP))
                return realIP;

            return httpContext.Connection.RemoteIpAddress?.ToString();
        }
        catch
        {
            return null;
        }
    }
}