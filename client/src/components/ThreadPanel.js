import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import './ThreadPanel.css';

export default function ThreadPanel({ message, onClose, onMessageUpdate }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { apiFetch } = useApi();
  const [thread, setThread] = useState([]);

  const loadThread = useCallback(async () => {
    const data = await apiFetch(`/api/messages/${message.id}/replies`);
    setThread(data);
    // Update the parent message with latest data
    const parent = data.find(m => m.id === message.id);
    if (parent) onMessageUpdate(parent);
  }, [message.id, apiFetch]);

  useEffect(() => {
    loadThread();
  }, [message.id]);

  useEffect(() => {
    if (!socket) return;

    const onNew = (msg) => {
      if (msg.parent_id === message.id || msg.id === message.id) {
        setThread(prev => {
          const exists = prev.find(m => m.id === msg.id);
          return exists ? prev : [...prev, msg];
        });
      }
    };
    const onUpdated = (msg) => {
      setThread(prev => prev.map(m => m.id === msg.id ? msg : m));
      if (msg.id === message.id) onMessageUpdate(msg);
    };
    const onDeleted = ({ id }) => setThread(prev => prev.filter(m => m.id !== id));
    const onReaction = ({ message_id, reactions }) => {
      setThread(prev => prev.map(m => m.id === message_id ? { ...m, reactions } : m));
    };

    socket.on('message:new', onNew);
    socket.on('message:updated', onUpdated);
    socket.on('message:deleted', onDeleted);
    socket.on('reaction:updated', onReaction);

    return () => {
      socket.off('message:new', onNew);
      socket.off('message:updated', onUpdated);
      socket.off('message:deleted', onDeleted);
      socket.off('reaction:updated', onReaction);
    };
  }, [socket, message.id]);

  const sendReply = (content) => {
    socket?.emit('message:send', {
      channel_id: message.channel_id || null,
      dm_conversation_id: message.dm_conversation_id || null,
      parent_id: message.id,
      content
    });
  };

  const replies = thread.filter(m => m.id !== message.id);

  return (
    <div className="thread-panel">
      <div className="thread-header">
        <span className="thread-title">Thread</span>
        <button className="thread-close" onClick={onClose}>✕</button>
      </div>

      <div className="thread-body">
        <div className="thread-parent">
          <MessageList
            messages={[message]}
            currentUserId={user.id}
            onOpenThread={() => {}}
            socket={socket}
            context={message.channel_id ? { channel_id: message.channel_id } : { dm_conversation_id: message.dm_conversation_id }}
          />
        </div>

        {replies.length > 0 && (
          <>
            <div className="thread-divider">
              <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
            </div>
            <MessageList
              messages={replies}
              currentUserId={user.id}
              onOpenThread={() => {}}
              socket={socket}
              context={message.channel_id ? { channel_id: message.channel_id } : { dm_conversation_id: message.dm_conversation_id }}
            />
          </>
        )}
      </div>

      <MessageComposer
        placeholder="Reply..."
        onSend={sendReply}
      />
    </div>
  );
}
