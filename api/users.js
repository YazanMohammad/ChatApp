const { store, pruneOffline } = require('./_lib/store');
const { getUserFromRequest } = require('./_lib/auth');

module.exports = async function handler(req, res) {
    const username = getUserFromRequest(req, store);
    if (!username) return res.status(401).json({ error: 'Not authenticated' });

    pruneOffline();

    const onlineUsers = Object.keys(store.online).map((u) => ({
        username: u,
        displayColor: store.users[u]?.displayColor || '#4ECDC4',
    }));

    return res.status(200).json(onlineUsers);
};
