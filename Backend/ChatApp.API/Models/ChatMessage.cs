namespace ChatApp.API.Models;

public class ChatMessage
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// When set, this is a private message to the specified user.
    /// When null, it's a public message visible to everyone.
    /// </summary>
    public string? Recipient { get; set; }
}