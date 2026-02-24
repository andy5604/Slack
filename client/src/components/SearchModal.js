import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import Avatar from './Avatar';
import './SearchModal.css';

function formatTime(ts) {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function SearchModal({ onClose, channels, onChannelSelect }) {
  const { apiFetch } = useApi();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleResultClick = (result) => {
    if (result.channel_id) {
      onChannelSelect(result.channel_id);
    }
    onClose();
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i}>{part}</mark>
        : part
    );
  };

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-input-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/>
          </svg>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search messages"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onClose()}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        <div className="search-results">
          {loading && (
            <div className="search-empty">Searching...</div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="search-empty">No results found for "<strong>{query}</strong>"</div>
          )}
          {!loading && query.length < 2 && (
            <div className="search-empty-hint">
              <p>Search for messages across all your channels and DMs.</p>
              <p>Try searching for a keyword or phrase.</p>
            </div>
          )}
          {results.map(result => (
            <button
              key={result.id}
              className="search-result"
              onClick={() => handleResultClick(result)}
            >
              <Avatar user={result} size={36} />
              <div className="search-result-body">
                <div className="search-result-meta">
                  <span className="result-author">{result.display_name}</span>
                  {result.channel_name && (
                    <span className="result-channel">#{result.channel_name}</span>
                  )}
                  <span className="result-time">{formatTime(result.created_at)}</span>
                </div>
                <div className="search-result-content">
                  {highlightText(result.content, query)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
