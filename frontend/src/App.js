import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
import Chat from './components/Chat';
import ConnectionStatus from './components/ConnectionStatus';
import UserSetup from './components/UserSetup';
import config from './config';
import signalRServiceOriginal from './services/signalRService';
import pollingServiceOriginal from './services/pollingService';

const signalRService = config.usePolling ? pollingServiceOriginal : signalRServiceOriginal;

function App() {
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [messages, setMessages] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);

  // Private messaging state
  const [activeChat, setActiveChat] = useState(null); // null = general, string = DM user
  const [privateMessages, setPrivateMessages] = useState({}); // { username: ChatMessage[] }
  const [unreadDMs, setUnreadDMs] = useState({}); // { username: number }

  const handleDisconnect = useCallback(async () => {
    if (username) {
      await signalRService.leaveChat(username);
    }
    await signalRService.stopConnection();
    signalRService.removeAllListeners();
    setIsConnected(false);
    setUsername('');
    setMessages([]);
    setConnectedUsers([]);
    setActiveChat(null);
    setPrivateMessages({});
    setUnreadDMs({});
    localStorage.removeItem('chatUsername');
  }, [username]);

  useEffect(() => {
    const storedUsername = localStorage.getItem('chatUsername');
    if (storedUsername) setUsername(storedUsername);
    return () => { handleDisconnect(); };
  }, [handleDisconnect]);

  const handleClearChat = useCallback(() => {
    if (activeChat) {
      // Clear DM with a specific user
      setPrivateMessages((prev) => ({ ...prev, [activeChat]: [] }));
    } else {
      // Clear general chat
      setMessages([]);
    }
  }, [activeChat]);

  const handleSelectUser = useCallback((targetUser) => {
    if (targetUser === null) {
      setActiveChat(null);
      return;
    }
    setActiveChat(targetUser);
    // Clear unread badge for this user
    setUnreadDMs((prev) => {
      const next = { ...prev };
      delete next[targetUser];
      return next;
    });
    // Request DM history from server
    signalRService.getPrivateHistory(targetUser);
  }, []);

  const handleConnect = async (newUsername, password, isNewUser) => {
    if (!newUsername.trim() || !password.trim()) return;

    setIsConnecting(true);
    setConnectionError('');

    try {
      await signalRService.startConnection();
      signalRService.removeAllListeners();

      signalRService.onReceiveMessage((message) => {
        setMessages((prev) => [...prev, { ...message, type: 'message' }]);
      });

      signalRService.onReceivePrivateMessage((message) => {
        const lowerMe = newUsername.trim().toLowerCase();
        const isSentByMe = message.username.toLowerCase() === lowerMe;
        const otherUser = isSentByMe ? message.recipient : message.username;

        setPrivateMessages((prev) => ({
          ...prev,
          [otherUser]: [...(prev[otherUser] || []), { ...message, type: 'private' }],
        }));

        // Only increment unread for messages FROM others, not messages we sent
        if (!isSentByMe) {
          setActiveChat((currentActive) => {
            if (currentActive !== otherUser) {
              setUnreadDMs((prevUnread) => ({
                ...prevUnread,
                [otherUser]: (prevUnread[otherUser] || 0) + 1,
              }));
            }
            return currentActive;
          });
        }
      });

      signalRService.onPrivateHistory((history) => {
        if (!history || history.length === 0) return;
        const lowerMe = newUsername.trim().toLowerCase();
        const first = history[0];
        const otherUser =
          first.username.toLowerCase() === lowerMe ? first.recipient : first.username;
        setPrivateMessages((prev) => ({
          ...prev,
          [otherUser]: history.map((msg) => ({ ...msg, type: 'private' })),
        }));
      });

      signalRService.onUserJoined((joinedUser) => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            message: `${joinedUser} joined the chat`,
            timestamp: new Date().toISOString(),
            type: 'system',
          },
        ]);
      });

      signalRService.onUserLeft((leftUser) => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            message: `${leftUser} left the chat`,
            timestamp: new Date().toISOString(),
            type: 'system',
          },
        ]);
      });

      signalRService.onUpdateUserList((users) => {
        setConnectedUsers(users.map((u) => u.username || u));
      });

      signalRService.onChatHistory((history) => {
        if (history?.length > 0) {
          setMessages(history.map((msg) => ({ ...msg, type: 'message' })));
        }
      });

      signalRService.onError((errorMessage) => {
        setConnectionError(errorMessage);
      });

      const authResult = await signalRService.authenticateAndJoin(
        newUsername.trim(),
        password.trim(),
        isNewUser
      );

      if (authResult.success) {
        // Use the server-returned username to ensure casing matches messages
        const serverUsername = authResult.user?.username || newUsername.trim();
        setUsername(serverUsername);
        setIsConnected(true);
        localStorage.setItem('chatUsername', serverUsername);
      } else {
        throw new Error(authResult.message);
      }
    } catch (error) {
      if (error.retryAfterSeconds) throw error;
      setConnectionError(error.message || 'Failed to connect. Please try again.');
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          <span className="header-icon">💬</span>
          SecureChat
        </h1>
        <ConnectionStatus />
      </header>

      <main className="App-main">
        {!isConnected ? (
          <UserSetup
            onConnect={handleConnect}
            isConnecting={isConnecting}
            connectionError={connectionError}
            initialUsername={username}
          />
        ) : (
          <Chat
            username={username}
            messages={messages}
            connectedUsers={connectedUsers}
            onDisconnect={handleDisconnect}
            activeChat={activeChat}
            onSelectUser={handleSelectUser}
            onClearChat={handleClearChat}
            privateMessages={privateMessages}
            unreadDMs={unreadDMs}
          />
        )}
      </main>
    </div>
  );
}

export default App;
