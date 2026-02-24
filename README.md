# Slack Clone — Productivity Web App

A full-featured Slack-like productivity web application with real-time messaging.

## Features

- **Channels** — Public channels with `#` prefix, create new channels
- **Direct Messages** — Private 1:1 conversations
- **Real-time messaging** — Powered by Socket.io, messages appear instantly
- **Message threads** — Reply to messages in a side panel thread view
- **Emoji reactions** — React to messages with 10 emoji options
- **Typing indicators** — See when others are typing
- **Message editing & deletion** — Edit or delete your own messages
- **Online presence** — Green dot shows who's currently online
- **Message formatting** — Bold (`**text**`), italic (`*text*`), inline code (`` `code` ``)
- **Search** — Full-text search across all accessible channels
- **User profiles** — Set display name, status, and status emoji
- **Authentication** — Register/login with JWT tokens

## Tech Stack

- **Frontend**: React 18
- **Backend**: Node.js + Express
- **Real-time**: Socket.io
- **Database**: SQLite (via better-sqlite3)
- **Auth**: JWT + bcrypt

## Quick Start

```bash
# Install dependencies
npm run install:all

# Start backend (port 3001)
npm run start:server

# In another terminal, start frontend (port 3000)
npm run start:client
```

Then open http://localhost:3000

## Demo Accounts

All demo accounts use password: `password123`

| Email | Name |
|-------|------|
| admin@example.com | Admin User |
| alice@example.com | Alice Johnson |
| bob@example.com | Bob Smith |
| carol@example.com | Carol White |
