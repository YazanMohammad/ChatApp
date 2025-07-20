import React, { useCallback, useState } from 'react';
import signalRService from '../services/signalRService';
import MessageInput from './MessageInput';
import MessageList from './MessageList';

const Chat = ({ username, messages, connectedUsers, onUsernameChange, onDisconnect }) => {
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(username);

  const handleSendMessage = useCallback(async (message) => {
    try {
      await signalRService.sendMessage(username, message);
    } catch (error) {
      console.error('Failed to send message:', error);
      // You could add error handling UI here
    }
  }, [username]);

  const handleUsernameEdit = () => {
    setIsEditingUsername(true);
    setNewUsername(username);
  };

  const handleUsernameSave = async () => {
    if (newUsername.trim() && newUsername.trim() !== username) {
      await onUsernameChange(newUsername.trim());
    }
    setIsEditingUsername(false);
  };

  const handleUsernameCancel = () => {
    setNewUsername(username);
    setIsEditingUsername(false);
  };

  const handleUsernameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleUsernameSave();
    } else if (e.key === 'Escape') {
      handleUsernameCancel();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="user-info">
          <span>Logged in as: </span>
          {isEditingUsername ? (
            <div className="username-edit">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyDown={handleUsernameKeyPress}
                maxLength={20}
                autoFocus
              />
              <button className="btn-save" onClick={handleUsernameSave}>
                ✓
              </button>
              <button className="btn-cancel" onClick={handleUsernameCancel}>
                ✗
              </button>
            </div>
          ) : (
            <span className="username-display" onClick={handleUsernameEdit}>
              {username} ✏️
            </span>
          )}
        </div>
        <div className="chat-controls">
          <button className="btn-secondary" onClick={handleUsernameEdit}>
            Change Name
          </button>
          <button className="btn-danger" onClick={onDisconnect}>
            Leave Chat
          </button>
        </div>
      </div>

      <div className="chat-content">
        <div className="chat-main">
          <MessageList messages={messages} currentUsername={username} />
          <MessageInput key="message-input" onSendMessage={handleSendMessage} />
        </div>

        <div className="users-sidebar">
          <h3>Online Users ({connectedUsers.length})</h3>
          <ul className="users-list">
            {connectedUsers.map((user, index) => (
              <li key={index} className={user === username ? 'current-user' : ''}>
                {user} {user === username && '(You)'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Chat;
