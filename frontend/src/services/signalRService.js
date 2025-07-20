import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

class SignalRService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async startConnection() {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5237';

      this.connection = new HubConnectionBuilder()
        .withUrl(`${backendUrl}/chathub`, {
          withCredentials: false
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: retryContext => {
            if (retryContext.previousRetryCount < 3) {
              return Math.random() * 10000;
            } else {
              return null;
            }
          }
        })
        .configureLogging(LogLevel.Information)
        .build();

      this.connection.onreconnecting(() => {
        this.isConnected = false;
        console.log('SignalR: Attempting to reconnect...');
      });

      this.connection.onreconnected(() => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('SignalR: Reconnected successfully');
      });

      this.connection.onclose((error) => {
        this.isConnected = false;
        console.log('SignalR: Connection closed', error);
      });

      await this.connection.start();
      this.isConnected = true;
      console.log('SignalR: Connection established');

      return this.connection;
    } catch (error) {
      console.error('SignalR: Connection failed', error);
      this.isConnected = false;
      throw error;
    }
  }

  async stopConnection() {
    if (this.connection) {
      await this.connection.stop();
      this.isConnected = false;
      console.log('SignalR: Connection stopped');
    }
  }

  async authenticateAndJoin(username, password, isNewUser) {
    if (this.connection && this.isConnected) {
      try {
        const result = await this.connection.invoke('AuthenticateAndJoin', username, password, isNewUser);
        if (!result.success) {
          const error = new Error(result.message);
          error.retryAfterSeconds = result.retryAfterSeconds;
          error.isLocked = result.isLocked;
          throw error;
        }
        return result;
      } catch (error) {
        console.error('Authentication failed:', error);
        throw error;
      }
    } else {
      throw new Error('Not connected to chat hub');
    }
  }

  async sendMessage(username, message) {
    if (this.connection && this.isConnected) {
      try {
        await this.connection.invoke('SendMessage', username, message);
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    } else {
      throw new Error('Not connected to chat hub');
    }
  }

  async leaveChat(username) {
    if (this.connection && this.isConnected) {
      try {
        await this.connection.invoke('LeaveChat', username);
      } catch (error) {
        console.error('Failed to leave chat:', error);
      }
    }
  }

  onReceiveMessage(callback) {
    if (this.connection) {
      this.connection.on('ReceiveMessage', callback);
    }
  }

  onUserJoined(callback) {
    if (this.connection) {
      this.connection.on('UserJoined', callback);
      this.connection.on('userjoined', callback);
    }
  }

  onUserLeft(callback) {
    if (this.connection) {
      this.connection.on('UserLeft', callback);
      this.connection.on('userleft', callback);
    }
  }

  onUpdateUserList(callback) {
    if (this.connection) {
      this.connection.on('UpdateUserList', callback);
      this.connection.on('updateuserlist', callback);
    }
  }

  onChatHistory(callback) {
    if (this.connection) {
      this.connection.on('ChatHistory', callback);
      this.connection.on('chathistory', callback);
    }
  }

  onError(callback) {
    if (this.connection) {
      this.connection.on('Error', callback);
    }
  }

  removeAllListeners() {
    if (this.connection) {
      this.connection.off('ReceiveMessage');
      this.connection.off('UserJoined');
      this.connection.off('userjoined');
      this.connection.off('UserLeft');
      this.connection.off('userleft');
      this.connection.off('UpdateUserList');
      this.connection.off('updateuserlist');
      this.connection.off('ChatHistory');
      this.connection.off('chathistory');
      this.connection.off('Error');
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      connectionState: this.connection?.state || 'Disconnected'
    };
  }
}

const signalRServiceInstance = new SignalRService();
export default signalRServiceInstance;
