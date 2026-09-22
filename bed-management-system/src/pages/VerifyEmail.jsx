import React, { useState } from 'react';
import { api } from '../lib/api';
import '../styles/auth.css';

const VerifyEmail = ({ email, onVerified, onBackToLogin }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/verify-otp', { email, token: code });
      setSuccess(true);
      setTimeout(() => onVerified(), 1500);
    } catch (err) {
      setError(err.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>✅ Verified!</h1>
          <p style={{ textAlign: 'center' }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Bed Management System</h1>
        <h2>Verify Your Email</h2>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#666', marginBottom: 16 }}>
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label>Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              placeholder="000000"
              required
              style={{
                textAlign: 'center',
                fontSize: 24,
                letterSpacing: 8,
                padding: '12px',
              }}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <p className="auth-switch">
          Wrong email? <span onClick={onBackToLogin}>Go back</span>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;