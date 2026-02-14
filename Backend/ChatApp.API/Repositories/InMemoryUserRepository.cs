using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using ChatApp.API.Models;

namespace ChatApp.API.Repositories;

public class InMemoryUserRepository : IUserRepository
{
    private readonly ConcurrentDictionary<string, User> _registeredUsers = new();
    private readonly ConcurrentDictionary<string, User> _connectedUsers = new();

    private static readonly string[] Colors =
    {
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
        "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"
    };

    public bool UserExists(string username)
        => _registeredUsers.ContainsKey(username.ToLower());

    public User? GetByUsername(string username)
    {
        _registeredUsers.TryGetValue(username.ToLower(), out var user);
        return user;
    }

    public User? GetByConnectionId(string connectionId)
    {
        _connectedUsers.TryGetValue(connectionId, out var user);
        return user;
    }

    public bool Register(User user)
    {
        user.DisplayColor = Colors[Math.Abs(user.Username.GetHashCode()) % Colors.Length];
        return _registeredUsers.TryAdd(user.Username.ToLower(), user);
    }

    public void SetOnline(string username, string connectionId)
    {
        if (_registeredUsers.TryGetValue(username.ToLower(), out var user))
        {
            user.IsOnline = true;
            user.ConnectionId = connectionId;
            user.LastSeen = DateTime.UtcNow;
            _connectedUsers.TryAdd(connectionId, user);
        }
    }

    public void SetOffline(string connectionId)
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

    public List<User> GetOnlineUsers()
    {
        return _connectedUsers.Values
            .Where(u => u.IsOnline)
            .OrderBy(u => u.Username)
            .ToList();
    }

    public bool IsValidUsername(string username)
    {
        return username.Length >= 2 &&
               username.Length <= 20 &&
               Regex.IsMatch(username, @"^[a-zA-Z0-9_-]+$");
    }
}
