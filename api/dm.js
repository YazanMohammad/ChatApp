const { store, dmKey } = require('./_lib/store');
const { getUserFromRequest } = require('./_lib/auth');

module.exports = async function handler(req, res) {
    const username = getUserFromRequest(req, store);
    if (!username) return res.status(401).json({ error: 'Not authenticated' });

    if (req.method === 'GET') {
        const { with: otherUser, since } = req.query;
        if (!otherUser) return res.status(400).json({ error: 'Missing "with" query param' });

        const key = dmKey(username, otherUser);
        const all = store.privateMessages[key] || [];
        const sinceMs = since ? Number(since) : 0;
        const msgs = all.filter((m) => new Date(m.timestamp).getTime() > sinceMs);
        return res.status(200).json(msgs);
    }

    if (req.method === 'POST') {
        const { recipient, message } = req.body || {};
        if (!recipient || !message?.trim()) return res.status(400).json({ error: 'Recipient and message required' });
        if (!store.users[recipient.toLowerCase()]) return res.status(404).json({ error: 'Recipient not found' });

        const trimmed = message.trim().slice(0, 500);
        const key = dmKey(username, recipient);
        const msg = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            username,
            recipient,
            message: trimmed,
            timestamp: new Date().toISOString(),
        };

        if (!store.privateMessages[key]) store.privateMessages[key] = [];
        store.privateMessages[key].push(msg);

        // Cap at 200 per conversation
        if (store.privateMessages[key].length > 200) {
            store.privateMessages[key] = store.privateMessages[key].slice(-200);
        }

        return res.status(201).json(msg);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
