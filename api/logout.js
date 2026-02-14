const { store } = require('./_lib/store');
const { getUserFromRequest, parseCookies } = require('./_lib/auth');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const username = getUserFromRequest(req, store);
    if (username) {
        delete store.online[username];
    }

    // Clear session cookie
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies['chat_session'];
    if (token) delete store.sessions[token];

    res.setHeader('Set-Cookie', 'chat_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return res.status(200).json({ ok: true });
};
