import React, { useState, useRef, useEffect, useCallback } from 'react';
import './MessageComposer.css';

export default function MessageComposer({ placeholder, onSend, onTyping }) {
  const [content, setContent] = useState('');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleChange = (e) => {
    setContent(e.target.value);
    // Typing indicator
    if (onTyping) {
      onTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    if (!content.trim()) return;
    onSend(content.trim());
    setContent('');
    if (onTyping) {
      onTyping(false);
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const insertFormat = (prefix, suffix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const before = content.slice(0, start);
    const after = content.slice(end);
    const newContent = `${before}${prefix}${selected || 'text'}${suffix}${after}`;
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + (selected || 'text').length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, []);

  // Auto-resize
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
  }, [content]);

  return (
    <div className="composer">
      <div className="composer-box">
        <div className="composer-toolbar">
          <button
            className={`toolbar-btn ${bold ? 'active' : ''}`}
            title="Bold"
            onMouseDown={e => { e.preventDefault(); insertFormat('**', '**'); }}
          >
            <strong>B</strong>
          </button>
          <button
            className={`toolbar-btn ${italic ? 'active' : ''}`}
            title="Italic"
            onMouseDown={e => { e.preventDefault(); insertFormat('*', '*'); }}
          >
            <em>I</em>
          </button>
          <button
            className="toolbar-btn"
            title="Code"
            onMouseDown={e => { e.preventDefault(); insertFormat('`', '`'); }}
          >
            <code style={{fontFamily:'monospace'}}>{'<>'}</code>
          </button>
          <div className="toolbar-sep" />
          <button
            className="toolbar-btn"
            title="Strikethrough"
            onMouseDown={e => { e.preventDefault(); insertFormat('~~', '~~'); }}
          >
            <s>S</s>
          </button>
        </div>

        <textarea
          ref={textareaRef}
          className="composer-input"
          placeholder={placeholder || 'Message'}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        <div className="composer-bottom">
          <div className="composer-hints">
            <span><kbd>Enter</kbd> to send</span>
            <span><kbd>Shift+Enter</kbd> for new line</span>
          </div>
          <button
            className={`send-btn ${content.trim() ? 'active' : ''}`}
            onClick={submit}
            disabled={!content.trim()}
            title="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21L23 12 2 3v7l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
