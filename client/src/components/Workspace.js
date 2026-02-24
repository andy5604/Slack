import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useApi } from '../hooks/useApi';
import Sidebar from './Sidebar';
import ChannelView from './ChannelView';
import DMView from './DMView';
import ThreadPanel from './ThreadPanel';
import SearchModal from './SearchModal';
import ProfileModal from './ProfileModal';
import './Workspace.css';

export default function Workspace() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { apiFetch } = useApi();

  const [channels, setChannels] = useState([]);
  const [dmConversations, setDmConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeView, setActiveView] = useState(null); // { type: 'channel'|'dm', id }
  const [threadMessage, setThreadMessage] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const loadChannels = useCallback(async () => {
    const data = await apiFetch('/api/channels');
    setChannels(data);
    if (!activeView && data.length > 0) {
      const general = data.find(c => c.name === 'general') || data[0];
      setActiveView({ type: 'channel', id: general.id });
    }
  }, [apiFetch]);

  const loadDMs = useCallback(async () => {
    const data = await apiFetch('/api/dm/conversations');
    setDmConversations(data);
  }, [apiFetch]);

  const loadUsers = useCallback(async () => {
    const data = await apiFetch('/api/users');
    setAllUsers(data);
  }, [apiFetch]);

  useEffect(() => {
    loadChannels();
    loadDMs();
    loadUsers();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('channel:created', (ch) => {
      setChannels(prev => [...prev, ch].sort((a, b) => a.name.localeCompare(b.name)));
    });
    socket.on('user:updated', (updated) => {
      setAllUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    });
    return () => {
      socket.off('channel:created');
      socket.off('user:updated');
    };
  }, [socket]);

  const openDM = async (userId) => {
    const data = await apiFetch('/api/dm/conversations', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId })
    });
    await loadDMs();
    setActiveView({ type: 'dm', id: data.id });
    setThreadMessage(null);
  };

  const handleChannelSelect = (id) => {
    setActiveView({ type: 'channel', id });
    setThreadMessage(null);
  };

  const handleDMSelect = (id) => {
    setActiveView({ type: 'dm', id });
    setThreadMessage(null);
  };

  const openThread = (message) => setThreadMessage(message);
  const closeThread = () => setThreadMessage(null);

  const activeChannel = activeView?.type === 'channel'
    ? channels.find(c => c.id === activeView.id)
    : null;
  const activeDM = activeView?.type === 'dm'
    ? dmConversations.find(d => d.id === activeView.id)
    : null;

  return (
    <div className="workspace">
      <Sidebar
        channels={channels}
        dmConversations={dmConversations}
        allUsers={allUsers}
        activeView={activeView}
        onChannelSelect={handleChannelSelect}
        onDMSelect={handleDMSelect}
        onDMOpen={openDM}
        onSearchOpen={() => setSearchOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onLogout={logout}
        onChannelsUpdate={loadChannels}
      />

      <div className="workspace-main">
        {activeView?.type === 'channel' && activeChannel && (
          <ChannelView
            channel={activeChannel}
            allUsers={allUsers}
            onOpenThread={openThread}
            onOpenDM={openDM}
          />
        )}
        {activeView?.type === 'dm' && activeDM && (
          <DMView
            conversation={activeDM}
            onOpenThread={openThread}
          />
        )}
        {!activeView && (
          <div className="workspace-empty">
            <h2>Welcome to Slack Clone</h2>
            <p>Select a channel or start a conversation to get started.</p>
          </div>
        )}
      </div>

      {threadMessage && (
        <ThreadPanel
          message={threadMessage}
          onClose={closeThread}
          onMessageUpdate={(updated) => setThreadMessage(updated)}
        />
      )}

      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          channels={channels}
          onChannelSelect={handleChannelSelect}
        />
      )}

      {profileOpen && (
        <ProfileModal onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}
