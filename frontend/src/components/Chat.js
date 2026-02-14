import React, { useCallback } from 'react';
import signalRService from '../services/signalRService';
import MessageInput from './MessageInput';
import MessageList from './MessageList';

const Chat = ({
  username,
  messages,
  connectedUsers,
  onDisconnect,
  activeChat,
  onSelectUser,
  onClearChat,
  privateMessages,
  unreadDMs,
}) => {
  const handleSendMessage = useCallback(
    async (message) => {
      if (activeChat) {
        await signalRService.sendPrivateMessage(activeChat, message);
      } else {
        await signalRService.sendMessage(username, message);
      }
    },
    [username, activeChat]
  );

  const getInitials = (name) =>
    name ? name.slice(0, 2).toUpperCase() : '??';

  const displayMessages = activeChat
    ? privateMessages[activeChat] || []
    : messages;

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="user-info">
          {activeChat ? (
            <>
              <span className="dm-indicator">DM</span>
              <span>with</span>
              <span className="username-display">{activeChat}</span>
            </>
          ) : (
            <>
              <span>💬</span>
              <span className="username-display">General Chat</span>
            </>
          )}
        </div>
        <div className="chat-controls">
          <button className="btn-clear" onClick={onClearChat} title="Clear messages">
            🗑️ Clear
          </button>
          <button className="btn-danger" onClick={onDisconnect}>
            Leave Chat
          </button>
        </div>
      </div>

      <div className="chat-content">
        <div className="chat-main">
          <MessageList
            messages={displayMessages}
            currentUsername={username}
            activeChat={activeChat}
          />
          <MessageInput
            onSendMessage={handleSendMessage}
            placeholder={
              activeChat
                ? `Message ${activeChat}…`
                : 'Type a message…'
            }
          />
        </div>

        <div className="users-sidebar">
          {/* General Chat button */}
          <button
            className={`sidebar-general ${activeChat === null ? 'active' : ''}`}
            onClick={() => onSelectUser(null)}
          >
            <span>💬</span>
            <span>General Chat</span>
          </button>

          <h3>Online — {connectedUsers.length}</h3>
          <ul className="users-list">
            {connectedUsers.map((user, index) => {
              const isCurrentUser = user === username;
              const isActive = activeChat === user;
              const unread = unreadDMs[user] || 0;

              return (
                <li
                  key={index}
                  className={[
                    isCurrentUser ? 'current-user' : 'clickable-user',
                    isActive ? 'active' : '',
                  ].join(' ')}
                  onClick={() => {
                    if (!isCurrentUser) onSelectUser(user);
                  }}
                  title={isCurrentUser ? 'You' : `Open DM with ${user}`}
                >
                  <span className="user-avatar">{getInitials(user)}</span>
                  <span className="user-name-text">
                    {user}{isCurrentUser && ' (You)'}
                  </span>
                  {unread > 0 && (
                    <span className="unread-badge">{unread}</span>
                  )}
                  <span className="online-dot" />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Chat;
