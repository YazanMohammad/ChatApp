import React, { useEffect, useRef } from 'react';

const MessageList = ({ messages, currentUsername }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (messageDate.getTime() === today.getTime()) {
      return timeString;
    } else {
      return `${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })} ${timeString}`;
    }
  };

  const renderMessage = (message, index) => {
    if (message.type === 'system') {
      return (
        <div key={`${message.id}-${index}`} className="message system-message">
          <div className="message-content">
            {message.message}
          </div>
        </div>
      );
    }

    const isOwnMessage = message.username === currentUsername;

    return (
      <div
        key={`${message.id}-${index}`}
        className={`message ${isOwnMessage ? 'own-message' : ''}`}
      >
        <div className="message-header">
          <span className="message-username">
            {isOwnMessage ? 'You' : message.username}
          </span>
          <span className="message-timestamp">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
        <div className="message-content">
          {message.message}
        </div>
      </div>
    );
  };

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="no-messages">
          <p>No messages yet. Start the conversation! 👋</p>
        </div>
      ) : (
        messages.map((message, index) => renderMessage(message, index))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
