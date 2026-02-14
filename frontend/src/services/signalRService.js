import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import config from '../config';

const EVENT_NAMES = [
  'ReceiveMessage',
  'ReceivePrivateMessage',
  'PrivateHistory',
  'UserJoined',
  'UserLeft',
  'UpdateUserList',
  'ChatHistory',
  'Error',
];

class SignalRService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async startConnection() {
    try {
      // Stop any existing connection to prevent duplicate handlers
      if (this.connection) {
        try {
          this.connection.off(); // Remove ALL listeners from old connection
          await this.connection.stop();
        } catch {
          // Ignore errors from stopping stale connection
        }
        this.connection = null;
        this.isConnected = false;
      }

      this.connection = new HubConnectionBuilder()
        .withUrl(`${config.backendUrl}${config.hubPath}`, {
          withCredentials: false,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (ctx) =>
            ctx.previousRetryCount < config.maxReconnectAttempts
              ? Math.random() * 10000
              : null,
        })
        .configureLogging(LogLevel.Warning)
        .build();

      this.connection.onreconnecting(() => {
        this.isConnected = false;
      });

      this.connection.onreconnected(() => {
        this.isConnected = true;
      });

      this.connection.onclose(() => {
        this.isConnected = false;
      });

      await this.connection.start();
      this.isConnected = true;
      return this.connection;
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  async stopConnection() {
    if (this.connection) {
      await this.connection.stop();
      this.isConnected = false;
    }
  }

  async authenticateAndJoin(username, password, isNewUser) {
    if (!this.connection || !this.isConnected) {
      throw new Error('Not connected to chat hub');
    }

    const result = await this.connection.invoke(
      'AuthenticateAndJoin',
      username,
      password,
      isNewUser
    );

    if (!result.success) {
      const error = new Error(result.message);
      error.retryAfterSeconds = result.retryAfterSeconds;
      error.isLocked = result.isLocked;
      throw error;
    }

    return result;
  }

  async sendMessage(username, message) {
    if (!this.connection || !this.isConnected) {
      throw new Error('Not connected to chat hub');
    }
    await this.connection.invoke('SendMessage', username, message);
  }

  async sendPrivateMessage(recipient, message) {
    if (!this.connection || !this.isConnected) {
      throw new Error('Not connected to chat hub');
    }
    await this.connection.invoke('SendPrivateMessage', recipient, message);
  }

  async getPrivateHistory(otherUser) {
    if (!this.connection || !this.isConnected) {
      throw new Error('Not connected to chat hub');
    }
    await this.connection.invoke('GetPrivateHistory', otherUser);
  }

  async leaveChat(username) {
    if (this.connection && this.isConnected) {
      try {
        await this.connection.invoke('LeaveChat', username);
      } catch {
        // Swallow errors during disconnect
      }
    }
  }

  on(event, callback) {
    this.connection?.on(event, callback);
  }

  onReceiveMessage(cb) { this.on('ReceiveMessage', cb); }
  onReceivePrivateMessage(cb) { this.on('ReceivePrivateMessage', cb); }
  onPrivateHistory(cb) { this.on('PrivateHistory', cb); }
  onUserJoined(cb) { this.on('UserJoined', cb); }
  onUserLeft(cb) { this.on('UserLeft', cb); }
  onUpdateUserList(cb) { this.on('UpdateUserList', cb); }
  onChatHistory(cb) { this.on('ChatHistory', cb); }
  onError(cb) { this.on('Error', cb); }

  removeAllListeners() {
    if (!this.connection) return;
    EVENT_NAMES.forEach((name) => this.connection.off(name));
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      connectionState: this.connection?.state || 'Disconnected',
    };
  }
}

const signalRService = new SignalRService();
export default signalRService;
