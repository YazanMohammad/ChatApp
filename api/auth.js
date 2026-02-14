const { store, getColor } = require('./_lib/store');
const { hashPassword, verifyPassword, generateToken } = require('./_lib/auth');

const MAX_FAILED = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username: rawUser, password, isNewUser } = req.body || {};
    if (!rawUser || !password) return res.status(400).json({ success: false, message: 'Username and password required' });

    const username = rawUser.trim().toLowerCase();

    // Validate username
    if (username.length < 2 || username.length > 20 || !/^[a-z0-9_-]+$/.test(username)) {
        return res.status(400).json({ success: false, message: 'Username: 2-20 chars, letters, numbers, _ - only' });
    }

    if (isNewUser) {
        // --- Register ---
        if (password.length < 6 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
            return res.status(400).json({ success: false, message: 'Password: min 6 chars with letters + numbers' });
        }
        if (store.users[username]) {
            return res.status(409).json({ success: false, message: 'Username already exists. Try logging in.' });
        }
        store.users[username] = {
            passwordHash: hashPassword(password),
            displayColor: getColor(username),
            joinedAt: new Date().toISOString(),
            failedAttempts: 0,
            lockoutUntil: null,
        };
    } else {
        // --- Login ---
        const user = store.users[username];
        if (!user) return res.status(404).json({ success: false, message: 'Username not found. Try creating an account.' });

        // Lockout check
        if (user.lockoutUntil && Date.now() < user.lockoutUntil) {
            const secs = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
            return res.status(429).json({ success: false, message: `Account locked. Try again in ${secs}s.`, retryAfterSeconds: secs, isLocked: true });
        }

        if (!verifyPassword(password, user.passwordHash)) {
            user.failedAttempts++;
            if (user.failedAttempts >= MAX_FAILED) {
                user.lockoutUntil = Date.now() + LOCKOUT_MS;
                return res.status(429).json({ success: false, message: `Too many attempts. Locked for 15 minutes.`, retryAfterSeconds: 900, isLocked: true });
            }
            const remaining = MAX_FAILED - user.failedAttempts;
            return res.status(401).json({ success: false, message: `Wrong password. ${remaining} attempts left.` });
        }

        user.failedAttempts = 0;
        user.lockoutUntil = null;
    }

    // Issue session
    const token = generateToken();
    store.sessions[token] = username;
    store.online[username] = Date.now();

    res.setHeader('Set-Cookie', `chat_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return res.status(200).json({
        success: true,
        message: isNewUser ? 'Account created!' : 'Login successful!',
        user: { username, displayColor: store.users[username].displayColor },
    });
};
