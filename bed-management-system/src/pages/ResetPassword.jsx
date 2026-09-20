import React, { useState } from 'react';
import { api } from '../lib/api';
import '../styles/auth.css';

const ResetPassword = ({ email, onResetDone, onBackToLogin }) => {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', {
        email,
        token: code,
        new_password: newPassword,
      });
      setSuccess(true);
      setTimeout(() => onResetDone(), 1500);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>✅ Password Reset!</h1>
          <p style={{ textAlign: 'center' }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Bed Management System</h1>
        <h2>Reset Your Password</h2>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#666', marginBottom: 16 }}>
          We sent a code to <strong>{email}</strong>
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Reset Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              placeholder="000000"
              required
              style={{
                textAlign: 'center',
                fontSize: 22,
                letterSpacing: 6,
                padding: '10px',
              }}
            />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="auth-switch">
          Wrong email? <span onClick={onBackToLogin}>Go back</span>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;