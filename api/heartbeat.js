const { store, pruneOffline } = require('./_lib/store');
const { getUserFromRequest } = require('./_lib/auth');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const username = getUserFromRequest(req, store);
    if (!username) return res.status(401).json({ error: 'Not authenticated' });

    store.online[username] = Date.now();
    pruneOffline();

    return res.status(200).json({ ok: true });
};
