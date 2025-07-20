using Microsoft.AspNetCore.SignalR;
using ChatApp.API.Models;
using ChatApp.API.Services;

namespace ChatApp.API.Hubs;

public class ChatHub : Hub
{
    private readonly ChatService _chatService;

    public ChatHub(ChatService chatService)
    {
        _chatService = chatService;
    }

    public async Task<AuthResponse> AuthenticateAndJoin(string username, string password, bool isNewUser)
    {
        var clientIP = GetClientIPAddress();
        
        var authResult = _chatService.AuthenticateUser(username, password, isNewUser, clientIP);
        
        if (authResult.Success && authResult.User != null)
        {
            _chatService.SetUserOnline(authResult.User.Username, Context.ConnectionId);
            
            await Clients.All.SendAsync("UserJoined", authResult.User.Username);
            
            var onlineUsers = _chatService.GetOnlineUsers();
            await Clients.All.SendAsync("UpdateUserList", onlineUsers);

            var recentMessages = _chatService.GetRecentMessages(50);
            await Clients.Caller.SendAsync("ChatHistory", recentMessages);
        }
        
        return authResult;
    }

    private string? GetClientIPAddress()
    {
        try
        {
            var context = Context.GetHttpContext();
            if (context != null)
            {
                var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
                if (!string.IsNullOrEmpty(forwardedFor))
                {
                    return forwardedFor.Split(',')[0].Trim();
                }

                var realIP = context.Request.Headers["X-Real-IP"].FirstOrDefault();
                if (!string.IsNullOrEmpty(realIP))
                {
                    return realIP;
                }

                return context.Connection.RemoteIpAddress?.ToString();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting client IP: {ex.Message}");
        }
        
        return null;
    }

    public async Task SendMessage(string username, string message)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(message))
            return;

        var user = _chatService.GetUserByConnectionId(Context.ConnectionId);
        if (user == null || user.Username.ToLower() != username.ToLower())
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

        _chatService.AddMessage(chatMessage);
        await Clients.All.SendAsync("ReceiveMessage", chatMessage);
    }

    public async Task LeaveChat(string username)
    {
        _chatService.SetUserOffline(Context.ConnectionId);
        
        await Clients.All.SendAsync("UserLeft", username);
        
        var onlineUsers = _chatService.GetOnlineUsers();
        await Clients.All.SendAsync("UpdateUserList", onlineUsers);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var user = _chatService.GetUserByConnectionId(Context.ConnectionId);
        if (user != null)
        {
            _chatService.SetUserOffline(Context.ConnectionId);
            
            await Clients.All.SendAsync("UserLeft", user.Username);
            
            var onlineUsers = _chatService.GetOnlineUsers();
            await Clients.All.SendAsync("UpdateUserList", onlineUsers);
        }

        await base.OnDisconnectedAsync(exception);
    }
}