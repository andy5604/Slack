import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import Avatar from './Avatar';
import './DMView.css';

export default function DMView({ conversation, onOpenThread }) {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { apiFetch } = useApi();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const loadMessages = useCallback(async () => {
    const data = await apiFetch(`/api/dm/${conversation.id}/messages`);
    setMessages(data);
  }, [conversation.id, apiFetch]);

  useEffect(() => {
    loadMessages();
  }, [conversation.id]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('dm:join', conversation.id);

    const onNew = (msg) => {
      if (msg.dm_conversation_id === conversation.id) {
        setMessages(prev => {
          const exists = prev.find(m => m.id === msg.id);
          return exists ? prev : [...prev, msg];
        });
      }
    };
    const onUpdated = (msg) => {
      if (msg.dm_conversation_id === conversation.id) {
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
      }
    };
    const onDeleted = ({ id }) => setMessages(prev => prev.filter(m => m.id !== id));
    const onReaction = ({ message_id, reactions }) => {
      setMessages(prev => prev.map(m => m.id === message_id ? { ...m, reactions } : m));
    };
    const onTyping = (data) => {
      if (data.dm_conversation_id !== conversation.id) return;
      if (data.userId === user.id) return;
      setTypingUsers(prev => {
        if (data.typing) return prev.includes(data.username) ? prev : [...prev, data.username];
        return prev.filter(u => u !== data.username);
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
  }, [socket, conversation.id, user.id]);

  const sendMessage = (content) => {
    socket?.emit('message:send', { dm_conversation_id: conversation.id, content });
  };

  const handleTyping = (isTyping) => {
    socket?.emit(isTyping ? 'typing:start' : 'typing:stop', { dm_conversation_id: conversation.id });
  };

  const isOnline = onlineUsers.has(conversation.other_user_id);

  return (
    <div className="dm-view">
      <div className="dm-header">
        <div className="dm-header-avatar">
          <Avatar user={conversation} size={24} />
          <span className={`presence-dot-header ${isOnline ? 'online' : ''}`} />
        </div>
        <span className="dm-header-name">{conversation.display_name}</span>
        <span className={`dm-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? 'Active now' : 'Away'}
        </span>
      </div>

      <div className="dm-body">
        <div className="dm-intro">
          <div className="dm-intro-avatar">
            <Avatar user={conversation} size={72} />
          </div>
          <h2>{conversation.display_name}</h2>
          <p>This is the very beginning of your direct message history with <strong>{conversation.display_name}</strong>.</p>
        </div>

        <MessageList
          messages={messages}
          currentUserId={user.id}
          onOpenThread={onOpenThread}
          socket={socket}
          context={{ dm_conversation_id: conversation.id }}
        />

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <span className="typing-dots"><span/><span/><span/></span>
            <span>{typingUsers.join(', ')} is typing...</span>
          </div>
        )}

        <MessageComposer
          placeholder={`Message ${conversation.display_name}`}
          onSend={sendMessage}
          onTyping={handleTyping}
        />
      </div>
    </div>
  );
}
