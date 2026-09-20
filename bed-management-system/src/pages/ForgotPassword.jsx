import React, { useState } from 'react';
import { api } from '../lib/api';
import '../styles/auth.css';

const ForgotPassword = ({ onCodeSent, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/request-password-reset', { email });
      onCodeSent(email);
    } catch (err) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Bed Management System</h1>
        <h2>Forgot Password</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Code'}
          </button>
        </form>

        <p className="auth-switch">
          Remembered? <span onClick={onBackToLogin}>Back to login</span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;