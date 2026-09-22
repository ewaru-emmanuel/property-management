import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { CURRENCY_OPTIONS } from '../hooks/useCurrency';
import '../styles/settings.css';

const Settings = () => {
  const qc = useQueryClient();

  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    currency: 'USD',
  });

  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  });

  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me'),
  });

  useEffect(() => {
    if (me?.profile) {
      setProfileData({
        full_name: me.profile.full_name || '',
        phone: me.profile.phone || '',
        currency: me.profile.currency || 'USD',
      });
    }
  }, [me]);

  const profileMutation = useMutation({
    mutationFn: (payload) => api.put('/api/auth/profile', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setProfileMsg({ type: 'success', text: 'Profile updated!' });
      setTimeout(() => setProfileMsg({ type: '', text: '' }), 3000);
    },
    onError: (err) => setProfileMsg({ type: 'error', text: err.message }),
  });

  const passwordMutation = useMutation({
    mutationFn: (payload) => api.post('/api/auth/change-password', payload),
    onSuccess: () => {
      setPasswordData({ new_password: '', confirm_password: '' });
      setPasswordMsg({ type: 'success', text: 'Password updated!' });
      setTimeout(() => setPasswordMsg({ type: '', text: '' }), 3000);
    },
    onError: (err) => setPasswordMsg({ type: 'error', text: err.message }),
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    profileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (passwordData.new_password.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    passwordMutation.mutate({ new_password: passwordData.new_password });
  };

  if (isLoading) return <p>Loading settings...</p>;

  return (
    <div className="settings-page">
      <h2>⚙️ Settings</h2>
      <p className="welcome">Manage your account and preferences.</p>

      {/* Profile Settings */}
      <div className="settings-section">
        <h3>👤 Profile Settings</h3>

        {profileMsg.text && (
          <div className={`settings-msg ${profileMsg.type}`}>{profileMsg.text}</div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <div className="settings-group">
            <label>Email</label>
            <input
              type="email"
              value={me?.user?.email || ''}
              disabled
            />
          </div>

          <div className="settings-group">
            <label>Full Name</label>
            <input
              type="text"
              value={profileData.full_name}
              onChange={(e) =>
                setProfileData({ ...profileData, full_name: e.target.value })
              }
            />
          </div>

          <div className="settings-group">
            <label>Phone</label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) =>
                setProfileData({ ...profileData, phone: e.target.value })
              }
            />
          </div>

          <div className="settings-group">
            <label>Currency</label>
            <select
              value={profileData.currency}
              onChange={(e) =>
                setProfileData({ ...profileData, currency: e.target.value })
              }
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="save-settings-btn"
            disabled={profileMutation.isPending}
          >
            {profileMutation.isPending ? 'Saving...' : '💾 Save Profile'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="settings-section">
        <h3>🔒 Change Password</h3>

        {passwordMsg.text && (
          <div className={`settings-msg ${passwordMsg.type}`}>{passwordMsg.text}</div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="settings-group">
            <label>New Password</label>
            <input
              type="password"
              value={passwordData.new_password}
              onChange={(e) =>
                setPasswordData({ ...passwordData, new_password: e.target.value })
              }
              minLength={6}
              required
            />
          </div>

          <div className="settings-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirm_password}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirm_password: e.target.value })
              }
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="save-settings-btn"
            disabled={passwordMutation.isPending}
          >
            {passwordMutation.isPending ? 'Updating...' : '🔒 Update Password'}
          </button>
        </form>
      </div>

      {/* Account */}
      <div className="settings-section">
        <h3>ℹ️ Account</h3>
        <div className="settings-group">
          <label>User ID</label>
          <input type="text" value={me?.user?.id || ''} disabled />
        </div>
        <div className="settings-group">
          <label>Email</label>
          <input type="text" value={me?.user?.email || ''} disabled />
        </div>
      </div>
    </div>
  );
};

export default Settings;