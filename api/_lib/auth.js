/**
 * Auth helpers — password hashing + session tokens.
 * Uses Web Crypto (available in Vercel Edge & Node 18+) for simplicity.
 */
const crypto = require('crypto');

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const attempt = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
    return hash === attempt;
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};
    return Object.fromEntries(
        cookieHeader.split(';').map((c) => {
            const [k, ...v] = c.trim().split('=');
            return [k, v.join('=')];
        })
    );
}

function getUserFromRequest(req, store) {
    const cookies = parseCookies(req.headers.get?.('cookie') || req.headers?.cookie || '');
    const token = cookies['chat_session'];
    if (!token) return null;
    return store.sessions[token] || null;
}

module.exports = { hashPassword, verifyPassword, generateToken, parseCookies, getUserFromRequest };
