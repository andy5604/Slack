import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useApi } from '../hooks/useApi';
import Avatar from './Avatar';
import './Sidebar.css';

export default function Sidebar({
  channels, dmConversations, allUsers, activeView,
  onChannelSelect, onDMSelect, onDMOpen,
  onSearchOpen, onProfileOpen, onLogout, onChannelsUpdate
}) {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const { apiFetch } = useApi();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showDMPicker, setShowDMPicker] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);

  const createChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      const ch = await apiFetch('/api/channels', {
        method: 'POST',
        body: JSON.stringify({ name: newChannelName, description: newChannelDesc })
      });
      setNewChannelName('');
      setNewChannelDesc('');
      setShowCreateChannel(false);
      await onChannelsUpdate();
      onChannelSelect(ch.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const otherUsers = allUsers.filter(u => u.id !== user?.id);

  return (
    <div className="sidebar">
      {/* Workspace Header */}
      <div className="sidebar-header">
        <button className="workspace-name" onClick={onProfileOpen}>
          <span className="workspace-name-text">Slack Clone</span>
          <span className="workspace-arrow">▾</span>
        </button>
        <button className="sidebar-icon-btn compose-btn" title="New message" onClick={() => setShowDMPicker(true)}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.5 1a1 1 0 0 1 .707.293l4.5 4.5A1 1 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 1 17.5v-15A1.5 1.5 0 0 1 2.5 1h11zm-1 2H3.5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V7h-3.5A1.5 1.5 0 0 1 12.5 5.5V3zM9 7a1 1 0 0 1 .993.883L10 8v2h2a1 1 0 0 1 .117 1.993L12 12h-2v2a1 1 0 0 1-1.993.117L8 14v-2H6a1 1 0 0 1-.117-1.993L6 10h2V8a1 1 0 0 1 1-1z"/>
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search" onClick={onSearchOpen}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="search-icon">
          <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/>
        </svg>
        <span>Search</span>
        <span className="search-hint">⌘K</span>
      </div>

      <div className="sidebar-scroll">
        {/* Channels */}
        <div className="sidebar-section">
          <button
            className="sidebar-section-header"
            onClick={() => setChannelsExpanded(!channelsExpanded)}
          >
            <span className={`chevron ${channelsExpanded ? 'open' : ''}`}>›</span>
            <span>Channels</span>
          </button>

          {channelsExpanded && (
            <div className="sidebar-items">
              {channels.map(ch => (
                <button
                  key={ch.id}
                  className={`sidebar-item ${activeView?.type === 'channel' && activeView.id === ch.id ? 'active' : ''}`}
                  onClick={() => onChannelSelect(ch.id)}
                >
                  <span className="channel-hash">#</span>
                  <span className="item-name">{ch.name}</span>
                </button>
              ))}
              <button className="sidebar-add-btn" onClick={() => setShowCreateChannel(true)}>
                <span className="add-icon">+</span>
                <span>Add channels</span>
              </button>
            </div>
          )}
        </div>

        {/* Direct Messages */}
        <div className="sidebar-section">
          <button
            className="sidebar-section-header"
            onClick={() => setDmsExpanded(!dmsExpanded)}
          >
            <span className={`chevron ${dmsExpanded ? 'open' : ''}`}>›</span>
            <span>Direct messages</span>
          </button>

          {dmsExpanded && (
            <div className="sidebar-items">
              {dmConversations.map(dm => (
                <button
                  key={dm.id}
                  className={`sidebar-item dm-item ${activeView?.type === 'dm' && activeView.id === dm.id ? 'active' : ''}`}
                  onClick={() => onDMSelect(dm.id)}
                >
                  <div className="dm-avatar-wrap">
                    <Avatar user={dm} size={18} />
                    <span className={`presence-dot ${onlineUsers.has(dm.other_user_id) ? 'online' : ''}`} />
                  </div>
                  <span className="item-name">{dm.display_name}</span>
                </button>
              ))}
              <button className="sidebar-add-btn" onClick={() => setShowDMPicker(true)}>
                <span className="add-icon">+</span>
                <span>Add teammates</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-user" onClick={onProfileOpen}>
          <div className="sidebar-user-avatar">
            <Avatar user={user} size={28} />
            <span className="presence-dot online" />
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.display_name}</span>
            <span className="sidebar-user-status">{user?.status_emoji} {user?.status || 'Active'}</span>
          </div>
        </button>
        <button className="sidebar-logout" onClick={onLogout} title="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="modal-overlay" onClick={() => setShowCreateChannel(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create a channel</h2>
              <button className="modal-close" onClick={() => setShowCreateChannel(false)}>✕</button>
            </div>
            <form onSubmit={createChannel}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name</label>
                  <div className="channel-input-wrap">
                    <span className="channel-hash-prefix">#</span>
                    <input
                      type="text"
                      placeholder="e.g. marketing"
                      value={newChannelName}
                      onChange={e => setNewChannelName(e.target.value.toLowerCase().replace(/\s/g, '-'))}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description <span style={{fontWeight:400,color:'#868686'}}>(optional)</span></label>
                  <input
                    type="text"
                    placeholder="What's this channel about?"
                    value={newChannelDesc}
                    onChange={e => setNewChannelDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateChannel(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={!newChannelName.trim()}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DM Picker Modal */}
      {showDMPicker && (
        <div className="modal-overlay" onClick={() => setShowDMPicker(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Start a direct message</h2>
              <button className="modal-close" onClick={() => setShowDMPicker(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{color:'#616061',marginBottom:12,fontSize:14}}>Select a teammate to message</p>
              <div className="user-list">
                {otherUsers.map(u => (
                  <button
                    key={u.id}
                    className="user-list-item"
                    onClick={() => { onDMOpen(u.id); setShowDMPicker(false); }}
                  >
                    <div style={{position:'relative',flexShrink:0}}>
                      <Avatar user={u} size={36} />
                      <span className={`presence-dot ${onlineUsers.has(u.id) ? 'online' : ''}`} style={{bottom:1,right:1}} />
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:15}}>{u.display_name}</div>
                      <div style={{color:'#868686',fontSize:13}}>@{u.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
