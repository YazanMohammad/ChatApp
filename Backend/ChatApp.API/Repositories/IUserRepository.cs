using ChatApp.API.Models;

namespace ChatApp.API.Repositories;

/// <summary>
/// Manages user registration, lookup, and online/offline state.
/// </summary>
public interface IUserRepository
{
    bool UserExists(string username);
    User? GetByUsername(string username);
    User? GetByConnectionId(string connectionId);
    bool Register(User user);
    void SetOnline(string username, string connectionId);
    void SetOffline(string connectionId);
    List<User> GetOnlineUsers();
    bool IsValidUsername(string username);
    string CreateSession(string username);
    User? GetUserBySessionToken(string token);
    void RemoveSession(string token);
    void TouchUser(string username);
    void PruneOffline(TimeSpan timeout);
}
