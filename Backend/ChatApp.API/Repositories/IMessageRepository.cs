using ChatApp.API.Models;

namespace ChatApp.API.Repositories;

/// <summary>
/// Manages chat message storage and retrieval.
/// </summary>
public interface IMessageRepository
{
    void Add(ChatMessage message);
    List<ChatMessage> GetRecent(int count = 50);
    void AddPrivate(ChatMessage message);
    List<ChatMessage> GetPrivateMessages(string user1, string user2, int count = 50);
}
