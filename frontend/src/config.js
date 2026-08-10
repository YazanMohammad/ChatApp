const rawUrl = process.env.REACT_APP_BACKEND_URL;
const backendUrl = (rawUrl && rawUrl.trim() !== '') ? rawUrl.trim().replace(/\/+$/, '') : 'http://localhost:5237';

const config = {
    backendUrl,
    maxMessageLength: 500,
    maxUsernameLength: 20,
    minUsernameLength: 2,
    minPasswordLength: 6,
    maxPasswordLength: 100,
    hubPath: '/chathub',
    maxReconnectAttempts: 3,
    usePolling: process.env.REACT_APP_USE_POLLING === 'true',
};

export default config;
