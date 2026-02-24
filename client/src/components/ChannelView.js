import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import './ChannelView.css';

export default function ChannelView({ channel, allUsers, onOpenThread, onOpenDM }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { apiFetch } = useApi();
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  const loadMessages = useCallback(async () => {
    const data = await apiFetch(`/api/channels/${channel.id}/messages`);
    setMessages(data);
  }, [channel.id, apiFetch]);

  const loadMembers = useCallback(async () => {
    const data = await apiFetch(`/api/channels/${channel.id}/members`);
    setMembers(data);
  }, [channel.id, apiFetch]);

  useEffect(() => {
    loadMessages();
    loadMembers();
  }, [channel.id]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('channel:join', channel.id);

    const onNew = (msg) => {
      if (msg.channel_id === channel.id) {
        setMessages(prev => {
          const exists = prev.find(m => m.id === msg.id);
          return exists ? prev : [...prev, msg];
        });
      }
    };
    const onUpdated = (msg) => {
      if (msg.channel_id === channel.id) {
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
      }
    };
    const onDeleted = ({ id }) => {
      setMessages(prev => prev.filter(m => m.id !== id));
    };
    const onReaction = ({ message_id, reactions }) => {
      setMessages(prev => prev.map(m => m.id === message_id ? { ...m, reactions } : m));
    };
    const onTyping = (data) => {
      if (data.channel_id !== channel.id) return;
      if (data.userId === user.id) return;
      setTypingUsers(prev => {
        if (data.typing) {
          return prev.includes(data.username) ? prev : [...prev, data.username];
        } else {
          return prev.filter(u => u !== data.username);
        }
      });
    };

    socket.on('message:new', onNew);
    socket.on('message:updated', onUpdated);
    socket.on('message:deleted', onDeleted);
    socket.on('reaction:updated', onReaction);
    socket.on('typing:update', onTyping);

    return () => {
      socket.off('message:new', onNew);
      socket.off('message:updated', onUpdated);
      socket.off('message:deleted', onDeleted);
      socket.off('reaction:updated', onReaction);
      socket.off('typing:update', onTyping);
    };
  }, [socket, channel.id, user.id]);

  const sendMessage = (content) => {
    if (!socket) return;
    socket.emit('message:send', { channel_id: channel.id, content });
  };

  const handleTyping = (isTyping) => {
    if (!socket) return;
    socket.emit(isTyping ? 'typing:start' : 'typing:stop', { channel_id: channel.id });
  };

  return (
    <div className="channel-view">
      <div className="channel-header">
        <div className="channel-header-left">
          <span className="channel-header-hash">#</span>
          <span className="channel-header-name">{channel.name}</span>
          {channel.description && (
            <span className="channel-header-desc">{channel.description}</span>
          )}
        </div>
        <div className="channel-header-right">
          <button
            className={`header-btn ${showMembers ? 'active' : ''}`}
            onClick={() => setShowMembers(!showMembers)}
            title="Members"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM17 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 0 0-1.5-4.33A5 5 0 0 1 19 16v1h-6.07zM6 11a5 5 0 0 1 5 5v1H1v-1a5 5 0 0 1 5-5z"/>
            </svg>
            <span>{members.length}</span>
          </button>
        </div>
      </div>

      <div className="channel-body">
        <div className="channel-messages-area">
          <MessageList
            messages={messages}
            currentUserId={user.id}
            onOpenThread={onOpenThread}
            socket={socket}
            context={{ channel_id: channel.id }}
          />
          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              <span className="typing-dots"><span/><span/><span/></span>
              <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
            </div>
          )}
          <MessageComposer
            placeholder={`Message #${channel.name}`}
            onSend={sendMessage}
            onTyping={handleTyping}
          />
        </div>

        {showMembers && (
          <div className="members-panel">
            <div className="members-panel-header">
              <span>Members ({members.length})</span>
              <button onClick={() => setShowMembers(false)} className="panel-close">✕</button>
            </div>
            <div className="members-list">
              {members.map(m => (
                <button
                  key={m.id}
                  className="member-item"
                  onClick={() => m.id !== user.id && onOpenDM(m.id)}
                >
                  <Avatar user={m} size={36} />
                  <div className="member-info">
                    <div className="member-name">{m.display_name}</div>
                    <div className="member-username">@{m.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Local Avatar import for members panel
function Avatar({ user, size }) {
  const initials = (user.display_name || user.username || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: 4,
      background: user.avatar_color || '#4A154B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38,
      flexShrink: 0, lineHeight: 1, userSelect: 'none'
    }}>{initials}</div>
  );
}
