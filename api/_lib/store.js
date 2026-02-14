/**
 * In-memory store for Vercel serverless functions.
 * Uses a global variable to persist across warm function invocations.
 * Data resets on cold starts — perfectly fine for a demo/portfolio app.
 */

// Persist across warm invocations via globalThis
if (!globalThis.__chatStore) {
    globalThis.__chatStore = {
        users: {},           // { username: { passwordHash, displayColor, joinedAt } }
        sessions: {},        // { token: username }
        messages: [],        // [{ id, username, message, timestamp }]
        privateMessages: {}, // { "user1:user2": [{ id, username, recipient, message, timestamp }] }
        online: {},          // { username: lastHeartbeat }
        failedAttempts: {},  // { ip: { count, lastAttempt } }
    };
}

const store = globalThis.__chatStore;

const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

function getColor(username) {
    let hash = 0;
    for (const ch of username) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
    return COLORS[Math.abs(hash) % COLORS.length];
}

// DM key normalisation — always sorted so both directions share the same bucket
function dmKey(a, b) {
    return [a, b].sort().join(':');
}

// Prune users that haven't sent a heartbeat in 15 seconds
function pruneOffline() {
    const cutoff = Date.now() - 15_000;
    for (const [user, ts] of Object.entries(store.online)) {
        if (ts < cutoff) delete store.online[user];
    }
}

module.exports = { store, getColor, dmKey, pruneOffline };
