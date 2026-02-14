import React, { useEffect, useRef } from 'react';

const MessageList = ({ messages, currentUsername, activeChat }) => {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return isToday
      ? time
      : `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
  };

  const getInitials = (name) =>
    name ? name.slice(0, 2).toUpperCase() : '??';

  const emptyText = activeChat
    ? `No messages with ${activeChat} yet. Say hi! 👋`
    : 'No messages yet. Start the conversation! 👋';

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="no-messages">
          <p>{emptyText}</p>
        </div>
      ) : (
        messages.map((msg, i) => {
          if (msg.type === 'system') {
            return (
              <div key={`${msg.id}-${i}`} className="system-message">
                {msg.message}
              </div>
            );
          }

          const isOwn = msg.username === currentUsername;

          return (
            <div
              key={`${msg.id}-${i}`}
              className={`message ${isOwn ? 'own-message' : ''}`}
            >
              <div className="message-avatar">{getInitials(msg.username)}</div>
              <div className="message-bubble">
                <div className="message-header">
                  <span className="message-username">
                    {isOwn ? 'You' : msg.username}
                  </span>
                  {msg.type === 'private' && (
                    <span className="private-label">Private</span>
                  )}
                  <span className="message-timestamp">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
                <div className="message-content">{msg.message}</div>
              </div>
            </div>
          );
        })
      )}
      <div ref={endRef} />
    </div>
  );
};

export default MessageList;
