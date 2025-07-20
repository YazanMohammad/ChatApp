import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
import Chat from './components/Chat';
import ConnectionStatus from './components/ConnectionStatus';
import UserSetup from './components/UserSetup';
import signalRService from './services/signalRService';

function App() {
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [messages, setMessages] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);

  const handleDisconnect = useCallback(async () => {
    console.log('handleDisconnect called');
    const currentUsername = username; // Capture current username
    if (currentUsername) {
      console.log('Leaving chat for user:', currentUsername);
      await signalRService.leaveChat(currentUsername);
    }
    console.log('Stopping SignalR connection...');
    await signalRService.stopConnection();
    console.log('Removing all listeners...');
    signalRService.removeAllListeners(); // Clear all event listeners
    console.log('Resetting state...');
    setIsConnected(false);
    setUsername('');
    setMessages([]);
    setConnectedUsers([]);
    localStorage.removeItem('chatUsername');
    console.log('Disconnect process completed');
  }, []); // Remove username dependency to prevent recreation

  useEffect(() => {
    const storedUsername = localStorage.getItem('chatUsername');
    if (storedUsername) {
      setUsername(storedUsername);
    }

    return () => {
      handleDisconnect();
    };
  }, [handleDisconnect]);

  const handleConnect = async (newUsername, password, isNewUser) => {
    if (!newUsername.trim() || !password.trim()) return;

    console.log('Starting connection process...');
    setIsConnecting(true);
    setConnectionError('');

    try {
      console.log('Connecting to SignalR...');
      await signalRService.startConnection();

      // Clear any existing listeners first to prevent duplicates
      signalRService.removeAllListeners();

      signalRService.onReceiveMessage((message) => {
        console.log('Received message:', message);
        setMessages(prev => [...prev, { ...message, type: 'message' }]);
      });

      signalRService.onUserJoined((joinedUsername) => {
        console.log('User joined:', joinedUsername);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          message: `${joinedUsername} joined the chat`,
          timestamp: new Date().toISOString(),
          type: 'system'
        }]);
      });

      signalRService.onUserLeft((leftUsername) => {
        console.log('User left:', leftUsername);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          message: `${leftUsername} left the chat`,
          timestamp: new Date().toISOString(),
          type: 'system'
        }]);
      });

      signalRService.onUpdateUserList((users) => {
        console.log('Updated user list:', users);
        const usernames = users.map(u => u.username || u);
        setConnectedUsers(usernames);
      });

      signalRService.onChatHistory((history) => {
        console.log('Chat history received:', history);
        if (history && history.length > 0) {
          setMessages(history.map(msg => ({ ...msg, type: 'message' })));
        }
      });

      signalRService.onError((errorMessage) => {
        console.error('SignalR Error:', errorMessage);
        setConnectionError(errorMessage);
      });

      console.log('Authenticating user...');
      const authResult = await signalRService.authenticateAndJoin(newUsername.trim(), password.trim(), isNewUser);

      console.log('Auth result:', authResult);
      if (authResult.success) {
        console.log('Authentication successful, setting connected state...');
        setUsername(newUsername.trim());
        setIsConnected(true);
        localStorage.setItem('chatUsername', newUsername.trim());
        console.log('Connection process completed successfully');
      } else {
        throw new Error(authResult.message);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      if (error.retryAfterSeconds) {
        throw error; // Pass the error with retry info to UserSetup
      }
      setConnectionError(error.message || 'Failed to connect to chat. Please try again.');
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUsernameChange = async (newUsername) => {
    if (isConnected) {
      await signalRService.leaveChat(username);
      // Note: For security, we don't allow username changes after auth
      // User would need to disconnect and reconnect with new credentials
      setConnectionError('To change username, please disconnect and create a new account.');
      return;
    }
    setUsername(newUsername.trim());
    localStorage.setItem('chatUsername', newUsername.trim());
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>💬 Secure Real-Time Chat</h1>
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
            onUsernameChange={handleUsernameChange}
            onDisconnect={handleDisconnect}
          />
        )}
      </main>

      <footer className="App-footer">
        <p>🛡️ Secure Chat with Brute Force Protection | Built with ASP.NET Core + SignalR & React</p>
      </footer>
    </div>
  );
}

export default App;
