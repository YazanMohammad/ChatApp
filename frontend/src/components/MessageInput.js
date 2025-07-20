import React, { useState } from 'react';

const MessageInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // You could add error handling UI here
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

  const handleChange = (e) => {
    if (e.target.value.length <= 500) { // Character limit
      setMessage(e.target.value);
    }
  };

  return (
    <div className="message-input">
      <form onSubmit={handleSubmit} className="message-input-form">
        <input
          type="text"
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isSending}
          maxLength={500}
          autoComplete="off"
        />
        <button
          type="submit"
          className="send-button"
          disabled={!message.trim() || isSending}
        >
          {isSending ? '⏳' : 'Send'}
        </button>
      </form>
      <div className="character-count">
        {message.length}/500
      </div>
    </div>
  );
};

export default MessageInput;
