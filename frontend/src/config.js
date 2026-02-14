const config = {
    backendUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5237',
    maxMessageLength: 500,
    maxUsernameLength: 20,
    minUsernameLength: 2,
    minPasswordLength: 6,
    maxPasswordLength: 100,
    hubPath: '/chathub',
    maxReconnectAttempts: 3,
};

export default config;
