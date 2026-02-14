const { store } = require('./_lib/store');
const { getUserFromRequest } = require('./_lib/auth');

module.exports = async function handler(req, res) {
    const username = getUserFromRequest(req, store);
    if (!username) return res.status(401).json({ error: 'Not authenticated' });

    if (req.method === 'GET') {
        // Poll messages — optionally filter by `since` timestamp
        const since = req.query.since ? Number(req.query.since) : 0;
        const msgs = store.messages.filter((m) => new Date(m.timestamp).getTime() > since);
        return res.status(200).json(msgs);
    }

    if (req.method === 'POST') {
        const { message } = req.body || {};
        if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });

        const trimmed = message.trim().slice(0, 500);
        const msg = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            username,
            message: trimmed,
            timestamp: new Date().toISOString(),
        };
        store.messages.push(msg);

        // Cap at 200 messages
        if (store.messages.length > 200) store.messages = store.messages.slice(-200);

        return res.status(201).json(msg);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
