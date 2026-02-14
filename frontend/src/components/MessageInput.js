import React, { useState } from 'react';
import config from '../config';

const MessageInput = ({ onSendMessage, placeholder }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
    } catch {
      // Error feedback is handled at the App level
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="message-input">
      <form onSubmit={handleSubmit} className="message-input-form">
        <input
          type="text"
          value={message}
          onChange={(e) =>
            e.target.value.length <= config.maxMessageLength &&
            setMessage(e.target.value)
          }
          onKeyPress={handleKeyPress}
          placeholder={placeholder || 'Type a message…'}
          disabled={isSending}
          maxLength={config.maxMessageLength}
          autoComplete="off"
        />
        <button
          type="submit"
          className="send-button"
          disabled={!message.trim() || isSending}
        >
          {isSending ? '⏳' : '➤'}
        </button>
      </form>
      <div className="character-count">
        {message.length}/{config.maxMessageLength}
      </div>
    </div>
  );
};

export default MessageInput;
