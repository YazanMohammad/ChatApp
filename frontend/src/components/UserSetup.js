import React, { useState, useEffect } from 'react';
import config from '../config';

const UserSetup = ({ onConnect, isConnecting, connectionError, initialUsername }) => {
  const [username, setUsername] = useState(initialUsername || '');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState('');

  // Countdown timer for lockout
  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) { setAuthError(''); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  // Password strength calculator
  useEffect(() => {
    if (!isLogin && password) {
      setPasswordStrength(getPasswordStrength(password));
    } else {
      setPasswordStrength('');
    }
  }, [password, isLogin]);

  const getPasswordStrength = (pwd) => {
    if (pwd.length < config.minPasswordLength) return { label: `Min ${config.minPasswordLength} characters`, color: '#ef4444' };
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(pwd)) return { label: 'Needs letters + numbers', color: '#f59e0b' };
    if (pwd.length < 8) return { label: 'Weak', color: '#f97316' };
    if (pwd.length >= 12 && /[!@#$%^&*]/.test(pwd)) return { label: 'Strong', color: '#6366f1' };
    return { label: 'Good', color: '#22c55e' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || isConnecting || retryAfter > 0) return;

    setAuthError('');
    try {
      await onConnect(username.trim(), password.trim(), !isLogin);
    } catch (error) {
      if (error.retryAfterSeconds) setRetryAfter(error.retryAfterSeconds);
      setAuthError(error.message || 'Authentication failed');
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9_-]*$/.test(value) && value.length <= config.maxUsernameLength) {
      setUsername(value);
    }
  };

  const isDisabled = isConnecting || retryAfter > 0;
  const isValidForm =
    username.trim().length >= config.minUsernameLength &&
    password.trim().length >= (isLogin ? 1 : config.minPasswordLength) &&
    retryAfter === 0;

  const getButtonText = () => {
    if (retryAfter > 0) return `Wait ${retryAfter}s…`;
    if (isConnecting) return 'Connecting…';
    return isLogin ? 'Login' : 'Create Account';
  };

  return (
    <div className="user-setup">
      <h2>{isLogin ? '👋 Welcome Back' : '🚀 Create Account'}</h2>
      <p>
        {isLogin
          ? 'Enter your credentials to continue chatting'
          : 'Choose a username and password for your chat identity'}
      </p>

      <form onSubmit={handleSubmit} className="user-setup-form">
        <input
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder="Username"
          disabled={isDisabled}
          maxLength={config.maxUsernameLength}
          autoComplete="username"
          autoFocus
        />

        <div className="password-field">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isLogin ? 'Password' : 'Password (letters + numbers)'}
            disabled={isDisabled}
            maxLength={config.maxPasswordLength}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          {!isLogin && passwordStrength && (
            <div className="password-strength" style={{ color: passwordStrength.color }}>
              {passwordStrength.label}
            </div>
          )}
        </div>

        <button type="submit" disabled={!isValidForm || isConnecting}>
          {getButtonText()}
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => { setIsLogin(!isLogin); setAuthError(''); setPassword(''); }}
          disabled={isDisabled}
        >
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
        </button>

        {(connectionError || authError) && (
          <div className="error-message">{authError || connectionError}</div>
        )}

        <div className="security-info">
          <h4>🛡️ Security</h4>
          <ul>
            <li>Passwords securely hashed</li>
            <li>Rate limiting prevents brute force</li>
            <li>Automatic lockout after failed attempts</li>
          </ul>
        </div>

        <div className="username-rules">
          <small>
            <strong>Username:</strong> {config.minUsernameLength}–{config.maxUsernameLength} chars, letters, numbers, _ -<br />
            <strong>Password:</strong>{' '}
            {isLogin ? 'Enter your password' : `Min ${config.minPasswordLength} chars with letters and numbers`}
          </small>
        </div>
      </form>
    </div>
  );
};

export default UserSetup;
