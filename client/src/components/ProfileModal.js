import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import Avatar from './Avatar';
import './ProfileModal.css';

const STATUS_EMOJIS = ['', '🏠', '🚌', '🤒', '📵', '🌴', '🎯', '💻', '📞', '🍔'];

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const { apiFetch } = useApi();
  const [form, setForm] = useState({
    display_name: user?.display_name || '',
    status: user?.status || '',
    status_emoji: user?.status_emoji || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiFetch('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal profile-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body profile-body">
            <div className="profile-avatar-section">
              <Avatar user={{ ...user, ...form }} size={80} />
              <div className="profile-info">
                <div className="profile-username">@{user?.username}</div>
                <div className="profile-email">{user?.email}</div>
              </div>
            </div>

            <div className="form-group">
              <label>Display name</label>
              <input
                type="text"
                value={form.display_name}
                onChange={e => setForm({ ...form, display_name: e.target.value })}
                placeholder="Your name"
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <div className="status-input-wrap">
                <select
                  className="status-emoji-select"
                  value={form.status_emoji}
                  onChange={e => setForm({ ...form, status_emoji: e.target.value })}
                >
                  {STATUS_EMOJIS.map(em => (
                    <option key={em} value={em}>{em || '😊'}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  placeholder="What's your status?"
                  className="status-text-input"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
