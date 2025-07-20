import React, { useState, useEffect } from 'react';

const UserSetup = ({ onConnect, isConnecting, connectionError, initialUsername }) => {
  const [username, setUsername] = useState(initialUsername || '');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState('');

  useEffect(() => {
    let timer;
    if (retryAfter > 0) {
      timer = setInterval(() => {
        setRetryAfter(prev => {
          if (prev <= 1) {
            setAuthError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [retryAfter]);

  useEffect(() => {
    if (!isLogin && password) {
      const strength = calculatePasswordStrength(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength('');
    }
  }, [password, isLogin]);

  const calculatePasswordStrength = (pwd) => {
    if (pwd.length < 6) return 'Too short (minimum 6 characters)';
    if (pwd.length < 8) return 'Weak';
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(pwd)) return 'Needs letters and numbers';
    if (pwd.length >= 8 && /(?=.*[a-zA-Z])(?=.*\d)/.test(pwd)) return 'Good';
    if (pwd.length >= 12 && /(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(pwd)) return 'Strong';
    return 'Good';
  };

  const getStrengthColor = (strength) => {
    switch (strength) {
      case 'Too short (minimum 6 characters)': return '#dc3545';
      case 'Weak': return '#fd7e14';
      case 'Needs letters and numbers': return '#ffc107';
      case 'Good': return '#198754';
      case 'Strong': return '#0d6efd';
      default: return '#6c757d';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username.trim() && password.trim() && !isConnecting && retryAfter === 0) {
      setAuthError('');
      try {
        await onConnect(username.trim(), password.trim(), !isLogin);
      } catch (error) {
        if (error.retryAfterSeconds) {
          setRetryAfter(error.retryAfterSeconds);
        }
        setAuthError(error.message || 'Authentication failed');
      }
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9_-]*$/.test(value) && value.length <= 20) {
      setUsername(value);
    }
  };

  const isValidForm = username.trim().length >= 2 &&
    password.trim().length >= (isLogin ? 1 : 6) &&
    retryAfter === 0;

  return (
    <div className="user-setup">
      <h2>{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
      <p>
        {isLogin
          ? 'Enter your username and password to continue chatting'
          : 'Choose a secure username and password for your chat identity'
        }
      </p>

      <form onSubmit={handleSubmit} className="user-setup-form">
        <input
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder="Username (2-20 characters, letters, numbers, _, -)"
          disabled={isConnecting || retryAfter > 0}
          maxLength={20}
          autoComplete="username"
          autoFocus
        />

        <div className="password-field">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isLogin ? "Password" : "Password (min 6 chars, letters + numbers)"}
            disabled={isConnecting || retryAfter > 0}
            maxLength={100}
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
          {!isLogin && passwordStrength && (
            <div
              className="password-strength"
              style={{ color: getStrengthColor(passwordStrength) }}
            >
              {passwordStrength}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!isValidForm || isConnecting}
        >
          {retryAfter > 0
            ? `Wait ${retryAfter}s...`
            : isConnecting
              ? 'Connecting...'
              : (isLogin ? 'Login' : 'Create Account')
          }
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setIsLogin(!isLogin);
            setAuthError('');
            setPassword('');
          }}
          disabled={isConnecting || retryAfter > 0}
        >
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
        </button>

        {(connectionError || authError) && (
          <div className="error-message">
            {authError || connectionError}
          </div>
        )}

        <div className="security-info">
          <h4>🛡️ Security Features:</h4>
          <ul>
            <li>Accounts protected by passwords</li>
            <li>Rate limiting prevents brute force attacks</li>
            <li>Account lockout after failed attempts</li>
            <li>Your password is securely hashed</li>
          </ul>
        </div>

        <div className="username-rules">
          <small>
            <strong>Username:</strong> 2-20 characters, letters, numbers, underscore, hyphen only<br />
            <strong>Password:</strong> {isLogin ? 'Enter your password' : 'Minimum 6 characters with letters and numbers'}
          </small>
        </div>
      </form>
    </div>
  );
};

export default UserSetup;
