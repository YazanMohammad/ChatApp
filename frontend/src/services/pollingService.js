/**
 * Polling-based chat service — drop-in replacement for signalRService.
 * Uses HTTP polling instead of WebSockets so it works on Vercel.
 */
import config from '../config';

const API = config.backendUrl;

class PollingService {
    constructor() {
        this.isConnected = false;
        this._pollInterval = null;
        this._heartbeatInterval = null;
        this._dmPollInterval = null;
        this._lastMessageTs = 0;
        this._lastDmTs = {};
        this._username = null;
        this._activeDmUser = null;
        this._knownUsers = [];

        // Callback holders
        this._onReceiveMessage = null;
        this._onReceivePrivateMessage = null;
        this._onPrivateHistory = null;
        this._onUserJoined = null;
        this._onUserLeft = null;
        this._onUpdateUserList = null;
        this._onChatHistory = null;
        this._onError = null;
    }

    async startConnection() {
        // Stop any existing polling
        this.stopConnection();
        this.isConnected = true;
        return true;
    }

    async stopConnection() {
        this._stopPolling();
        this.isConnected = false;
    }

    async authenticateAndJoin(username, password, isNewUser) {
        const res = await fetch(`${API}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password, isNewUser }),
        });

        const data = await res.json();

        if (!data.success) {
            const error = new Error(data.message);
            error.retryAfterSeconds = data.retryAfterSeconds;
            error.isLocked = data.isLocked;
            throw error;
        }

        this._username = data.user.username;
        this.isConnected = true;

        // Load initial chat history
        const histRes = await fetch(`${API}/api/messages`, { credentials: 'include' });
        const history = await histRes.json();
        if (history.length > 0 && this._onChatHistory) {
            this._onChatHistory(history);
            this._lastMessageTs = Math.max(...history.map((m) => new Date(m.timestamp).getTime()));
        }

        // Load online users
        await this._pollUsers();

        // Start polling loops
        this._startPolling();

        // Notify others that we joined
        if (this._onUserJoined) this._onUserJoined(this._username);

        return data;
    }

    _startPolling() {
        // Poll general messages every 1.2s
        this._pollInterval = setInterval(() => this._pollMessages(), 1200);
        // Poll users every 3s
        this._userPollInterval = setInterval(() => this._pollUsers(), 3000);
        // Heartbeat every 5s
        this._heartbeatInterval = setInterval(() => this._sendHeartbeat(), 5000);
        // Poll DMs every 1.5s (only when viewing a DM)
        this._dmPollInterval = setInterval(() => this._pollDMs(), 1500);
    }

    _stopPolling() {
        clearInterval(this._pollInterval);
        clearInterval(this._userPollInterval);
        clearInterval(this._heartbeatInterval);
        clearInterval(this._dmPollInterval);
        this._pollInterval = null;
        this._userPollInterval = null;
        this._heartbeatInterval = null;
        this._dmPollInterval = null;
    }

    async _pollMessages() {
        try {
            const res = await fetch(`${API}/api/messages?since=${this._lastMessageTs}`, { credentials: 'include' });
            if (!res.ok) return;
            const msgs = await res.json();
            for (const msg of msgs) {
                const ts = new Date(msg.timestamp).getTime();
                if (ts > this._lastMessageTs) this._lastMessageTs = ts;
                if (this._onReceiveMessage) this._onReceiveMessage(msg);
            }
        } catch { /* ignore poll errors */ }
    }

    async _pollDMs() {
        if (!this._activeDmUser) return;
        try {
            const since = this._lastDmTs[this._activeDmUser] || 0;
            const res = await fetch(
                `${API}/api/dm?with=${encodeURIComponent(this._activeDmUser)}&since=${since}`,
                { credentials: 'include' }
            );
            if (!res.ok) return;
            const msgs = await res.json();
            for (const msg of msgs) {
                const ts = new Date(msg.timestamp).getTime();
                if (ts > (this._lastDmTs[this._activeDmUser] || 0)) {
                    this._lastDmTs[this._activeDmUser] = ts;
                }
                if (this._onReceivePrivateMessage) this._onReceivePrivateMessage(msg);
            }
        } catch { /* ignore */ }
    }

    async _pollUsers() {
        try {
            const res = await fetch(`${API}/api/users`, { credentials: 'include' });
            if (!res.ok) return;
            const users = await res.json();
            const usernames = users.map((u) => u.username);

            // Detect joins/leaves
            const prevSet = new Set(this._knownUsers);
            const currSet = new Set(usernames);
            for (const u of usernames) {
                if (!prevSet.has(u) && u !== this._username && this._onUserJoined) {
                    this._onUserJoined(u);
                }
            }
            for (const u of this._knownUsers) {
                if (!currSet.has(u) && u !== this._username && this._onUserLeft) {
                    this._onUserLeft(u);
                }
            }
            this._knownUsers = usernames;

            if (this._onUpdateUserList) this._onUpdateUserList(users);
        } catch { /* ignore */ }
    }

    async _sendHeartbeat() {
        try {
            await fetch(`${API}/api/heartbeat`, { method: 'POST', credentials: 'include' });
        } catch { /* ignore */ }
    }

    async sendMessage(username, message) {
        const res = await fetch(`${API}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message }),
        });
        if (!res.ok) throw new Error('Failed to send message');
    }

    async sendPrivateMessage(recipient, message) {
        const res = await fetch(`${API}/api/dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ recipient, message }),
        });
        if (!res.ok) throw new Error('Failed to send DM');
    }

    async getPrivateHistory(otherUser) {
        this._activeDmUser = otherUser;
        this._lastDmTs[otherUser] = 0; // Reset to fetch all
        try {
            const res = await fetch(
                `${API}/api/dm?with=${encodeURIComponent(otherUser)}&since=0`,
                { credentials: 'include' }
            );
            if (!res.ok) return;
            const msgs = await res.json();
            if (msgs.length > 0) {
                this._lastDmTs[otherUser] = Math.max(...msgs.map((m) => new Date(m.timestamp).getTime()));
                if (this._onPrivateHistory) this._onPrivateHistory(msgs);
            }
        } catch { /* ignore */ }
    }

    async leaveChat(username) {
        this._stopPolling();
        try {
            await fetch(`${API}/api/logout`, { method: 'POST', credentials: 'include' });
        } catch { /* ignore */ }
    }

    // Event registration — same API as signalRService
    onReceiveMessage(cb) { this._onReceiveMessage = cb; }
    onReceivePrivateMessage(cb) { this._onReceivePrivateMessage = cb; }
    onPrivateHistory(cb) { this._onPrivateHistory = cb; }
    onUserJoined(cb) { this._onUserJoined = cb; }
    onUserLeft(cb) { this._onUserLeft = cb; }
    onUpdateUserList(cb) { this._onUpdateUserList = cb; }
    onChatHistory(cb) { this._onChatHistory = cb; }
    onError(cb) { this._onError = cb; }

    removeAllListeners() {
        this._onReceiveMessage = null;
        this._onReceivePrivateMessage = null;
        this._onPrivateHistory = null;
        this._onUserJoined = null;
        this._onUserLeft = null;
        this._onUpdateUserList = null;
        this._onChatHistory = null;
        this._onError = null;
    }

    getConnectionState() {
        return {
            isConnected: this.isConnected,
            connectionState: this.isConnected ? 'Connected' : 'Disconnected',
        };
    }
}

const pollingService = new PollingService();
export default pollingService;
