import React, { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import './MessageList.css';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢', '👀', '🔥', '✅', '🚀'];

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function isSameDay(ts1, ts2) {
  return new Date(ts1).toDateString() === new Date(ts2).toDateString();
}

function isSameAuthorRecent(msg1, msg2) {
  return msg1.user_id === msg2.user_id &&
    Math.abs(msg1.created_at - msg2.created_at) < 5 * 60 * 1000;
}

function renderContent(content) {
  // Simple markdown-like formatting
  const parts = content.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="inline-code">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    // Handle URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlParts = part.split(urlRegex);
    return urlParts.map((up, j) =>
      urlRegex.test(up)
        ? <a key={`${i}-${j}`} href={up} target="_blank" rel="noopener noreferrer">{up}</a>
        : up
    );
  });
}

export default function MessageList({ messages, currentUserId, onOpenThread, socket, context }) {
  const bottomRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const submitEdit = (e, msg) => {
    e.preventDefault();
    if (!editContent.trim() || editContent === msg.content) {
      setEditingId(null);
      return;
    }
    socket?.emit('message:edit', { id: msg.id, content: editContent.trim() });
    setEditingId(null);
  };

  const deleteMsg = (id) => {
    if (window.confirm('Delete this message?')) {
      socket?.emit('message:delete', { id });
    }
  };

  const toggleReaction = (messageId, emoji) => {
    socket?.emit('reaction:toggle', { message_id: messageId, emoji });
    setEmojiPickerFor(null);
  };

  // Group messages by day
  const grouped = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const showDateDivider = !prev || !isSameDay(prev.created_at, msg.created_at);
    const compact = !showDateDivider && prev && isSameAuthorRecent(prev, msg);
    grouped.push({ msg, showDateDivider, compact });
  });

  return (
    <div className="message-list">
      {grouped.map(({ msg, showDateDivider, compact }) => (
        <div key={msg.id}>
          {showDateDivider && (
            <div className="date-divider">
              <span>{formatDate(msg.created_at)}</span>
            </div>
          )}
          <div
            className={`message ${compact ? 'compact' : ''} ${hoveredId === msg.id ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredId(msg.id)}
            onMouseLeave={() => { setHoveredId(null); if (emojiPickerFor === msg.id) setEmojiPickerFor(null); }}
          >
            {!compact ? (
              <div className="message-avatar">
                <Avatar user={msg} size={36} />
              </div>
            ) : (
              <div className="message-avatar compact-spacer">
                <span className="compact-time">{formatTime(msg.created_at)}</span>
              </div>
            )}

            <div className="message-content">
              {!compact && (
                <div className="message-header">
                  <span className="message-author">{msg.display_name}</span>
                  <span className="message-time">{formatTime(msg.created_at)}</span>
                </div>
              )}

              {editingId === msg.id ? (
                <form onSubmit={e => submitEdit(e, msg)} className="edit-form">
                  <input
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    autoFocus
                    className="edit-input"
                  />
                  <div className="edit-actions">
                    <span>
                      <kbd>Esc</kbd> to cancel •{' '}
                      <kbd>Enter</kbd> to save
                    </span>
                    <div>
                      <button type="button" onClick={() => setEditingId(null)} className="edit-cancel">Cancel</button>
                      <button type="submit" className="edit-save">Save</button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className={`message-text ${msg.deleted ? 'deleted' : ''}`}>
                  {renderContent(msg.content)}
                  {msg.edited ? <span className="edited-mark">(edited)</span> : null}
                </div>
              )}

              {/* Reactions */}
              {msg.reactions?.length > 0 && (
                <div className="reactions">
                  {msg.reactions.map(r => (
                    <button
                      key={r.emoji}
                      className={`reaction ${r.reacted ? 'reacted' : ''}`}
                      onClick={() => toggleReaction(msg.id, r.emoji)}
                    >
                      <span>{r.emoji}</span>
                      <span className="reaction-count">{r.count}</span>
                    </button>
                  ))}
                  <button
                    className="reaction add-reaction"
                    onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Thread reply count */}
              {msg.reply_count > 0 && (
                <button className="thread-reply-btn" onClick={() => onOpenThread(msg)}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"/>
                  </svg>
                  <span>{msg.reply_count} {msg.reply_count === 1 ? 'reply' : 'replies'}</span>
                </button>
              )}
            </div>

            {/* Message Actions Toolbar */}
            {hoveredId === msg.id && editingId !== msg.id && (
              <div className="message-actions">
                <button
                  className="action-btn"
                  title="Add reaction"
                  onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                  </svg>
                </button>
                <button
                  className="action-btn"
                  title="Reply in thread"
                  onClick={() => onOpenThread(msg)}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z"/>
                  </svg>
                </button>
                {msg.user_id === currentUserId && (
                  <>
                    <button className="action-btn" title="Edit message" onClick={() => startEdit(msg)}>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                      </svg>
                    </button>
                    <button className="action-btn danger" title="Delete message" onClick={() => deleteMsg(msg.id)}>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Emoji Picker */}
            {emojiPickerFor === msg.id && (
              <div className="emoji-picker" onClick={e => e.stopPropagation()}>
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    className="emoji-option"
                    onClick={() => toggleReaction(msg.id, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
