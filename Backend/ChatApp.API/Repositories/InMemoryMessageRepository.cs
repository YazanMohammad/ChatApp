using ChatApp.API.Models;

namespace ChatApp.API.Repositories;

public class InMemoryMessageRepository : IMessageRepository
{
    private const int MaxMessages = 1000;

    private readonly List<ChatMessage> _messages = new();
    private readonly List<ChatMessage> _privateMessages = new();
    private readonly object _lock = new();

    public void Add(ChatMessage message)
    {
        lock (_lock)
        {
            _messages.Add(message);

            if (_messages.Count > MaxMessages)
            {
                _messages.RemoveRange(0, _messages.Count - MaxMessages);
            }
        }
    }

    public List<ChatMessage> GetRecent(int count = 50)
    {
        lock (_lock)
        {
            return _messages
                .TakeLast(count)
                .OrderBy(m => m.Timestamp)
                .ToList();
        }
    }

    public void AddPrivate(ChatMessage message)
    {
        lock (_lock)
        {
            _privateMessages.Add(message);

            if (_privateMessages.Count > MaxMessages)
            {
                _privateMessages.RemoveRange(0, _privateMessages.Count - MaxMessages);
            }
        }
    }

    public List<ChatMessage> GetPrivateMessages(string user1, string user2, int count = 50)
    {
        lock (_lock)
        {
            return _privateMessages
                .Where(m =>
                    (string.Equals(m.Username, user1, StringComparison.OrdinalIgnoreCase) &&
                     string.Equals(m.Recipient, user2, StringComparison.OrdinalIgnoreCase)) ||
                    (string.Equals(m.Username, user2, StringComparison.OrdinalIgnoreCase) &&
                     string.Equals(m.Recipient, user1, StringComparison.OrdinalIgnoreCase)))
                .TakeLast(count)
                .OrderBy(m => m.Timestamp)
                .ToList();
        }
    }
}
