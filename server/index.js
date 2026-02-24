const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { db, initDatabase } = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const JWT_SECRET = process.env.JWT_SECRET || 'slack-clone-secret-key-2024';
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

initDatabase();
seedDefaultData();

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── Seed Data ─────────────────────────────────────────────────────────────────
function seedDefaultData() {
  const existing = db.prepare('SELECT id FROM channels WHERE name = ?').get('general');
  if (existing) return;

  const userId = uuidv4();
  const hash = bcrypt.hashSync('password123', 10);
  db.prepare(`INSERT INTO users (id, username, display_name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(userId, 'admin', 'Admin User', 'admin@example.com', hash, '#E01E5A');

  const users = [
    { username: 'alice', name: 'Alice Johnson', email: 'alice@example.com', color: '#36C5F0' },
    { username: 'bob', name: 'Bob Smith', email: 'bob@example.com', color: '#2EB67D' },
    { username: 'carol', name: 'Carol White', email: 'carol@example.com', color: '#ECB22E' },
  ];
  const userIds = [userId];
  for (const u of users) {
    const id = uuidv4();
    userIds.push(id);
    db.prepare(`INSERT INTO users (id, username, display_name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, u.username, u.name, u.email, hash, u.color);
  }

  const channels = [
    { name: 'general', desc: 'Company-wide announcements and work-based matters' },
    { name: 'random', desc: 'A place for non-work-related flimflam, faffing, and general tomfoolery' },
    { name: 'engineering', desc: 'All things engineering' },
    { name: 'design', desc: 'Design discussions and resources' },
  ];

  for (const ch of channels) {
    const chId = uuidv4();
    db.prepare(`INSERT INTO channels (id, name, description, created_by) VALUES (?, ?, ?, ?)`)
      .run(chId, ch.name, ch.desc, userId);
    for (const uid of userIds) {
      db.prepare(`INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)`)
        .run(chId, uid);
    }
  }

  // Seed some messages
  const generalId = db.prepare('SELECT id FROM channels WHERE name = ?').get('general').id;
  const msgs = [
    [userIds[1], 'Hey everyone! Welcome to the team workspace! 👋'],
    [userIds[2], "Thanks! Excited to be here. This workspace looks great!"],
    [userIds[3], 'Welcome! Feel free to explore all the channels.'],
    [userId, 'Reminder: Team standup is at 10am daily in #engineering'],
  ];
  for (const [uid, content] of msgs) {
    db.prepare(`INSERT INTO messages (id, channel_id, user_id, content) VALUES (?, ?, ?, ?)`)
      .run(uuidv4(), generalId, uid, content);
  }
}

// ─── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { username, display_name, email, password } = req.body;
  if (!username || !display_name || !email || !password)
    return res.status(400).json({ error: 'All fields required' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) return res.status(400).json({ error: 'Username or email already taken' });

  const colors = ['#E01E5A', '#36C5F0', '#2EB67D', '#ECB22E', '#4A154B', '#007A5A'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(`INSERT INTO users (id, username, display_name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, username, display_name, email, hash, color);

  // Add to general channel
  const general = db.prepare('SELECT id FROM channels WHERE name = ?').get('general');
  if (general) db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)').run(general.id, id);

  const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
  const user = db.prepare('SELECT id, username, display_name, email, avatar_color, status, status_emoji FROM users WHERE id = ?').get(id);
  res.json({ token, user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// ─── User Routes ───────────────────────────────────────────────────────────────
app.get('/api/users', authMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, display_name, email, avatar_color, status, status_emoji FROM users').all();
  res.json(users);
});

app.get('/api/users/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, email, avatar_color, status, status_emoji FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

app.put('/api/users/me', authMiddleware, (req, res) => {
  const { display_name, status, status_emoji } = req.body;
  db.prepare('UPDATE users SET display_name = ?, status = ?, status_emoji = ? WHERE id = ?')
    .run(display_name || '', status || 'active', status_emoji || '', req.user.id);
  const user = db.prepare('SELECT id, username, display_name, email, avatar_color, status, status_emoji FROM users WHERE id = ?').get(req.user.id);
  io.emit('user:updated', user);
  res.json(user);
});

// ─── Channel Routes ────────────────────────────────────────────────────────────
app.get('/api/channels', authMiddleware, (req, res) => {
  const channels = db.prepare(`
    SELECT c.*, cm.user_id IS NOT NULL as is_member
    FROM channels c
    LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
    WHERE c.is_private = 0 OR cm.user_id IS NOT NULL
    ORDER BY c.name
  `).all(req.user.id);
  res.json(channels);
});

app.post('/api/channels', authMiddleware, (req, res) => {
  const { name, description, is_private } = req.body;
  if (!name) return res.status(400).json({ error: 'Channel name required' });

  const clean = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const existing = db.prepare('SELECT id FROM channels WHERE name = ?').get(clean);
  if (existing) return res.status(400).json({ error: 'Channel name taken' });

  const id = uuidv4();
  db.prepare(`INSERT INTO channels (id, name, description, is_private, created_by) VALUES (?, ?, ?, ?, ?)`)
    .run(id, clean, description || '', is_private ? 1 : 0, req.user.id);
  db.prepare(`INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)`).run(id, req.user.id);

  const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(id);
  io.emit('channel:created', channel);
  res.json(channel);
});

app.post('/api/channels/:id/join', authMiddleware, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)')
    .run(req.params.id, req.user.id);
  res.json({ ok: true });
});

app.get('/api/channels/:id/members', authMiddleware, (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_color, u.status, u.status_emoji
    FROM users u
    JOIN channel_members cm ON u.id = cm.user_id
    WHERE cm.channel_id = ?
  `).all(req.params.id);
  res.json(members);
});

// ─── Message Routes ────────────────────────────────────────────────────────────
function getMessagesQuery(where, params, userId) {
  const messages = db.prepare(`
    SELECT m.*, u.username, u.display_name, u.avatar_color,
      (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id) as reply_count
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE ${where} AND m.parent_id IS NULL AND m.deleted = 0
    ORDER BY m.created_at ASC
    LIMIT 100
  `).all(...params);

  return messages.map(msg => ({
    ...msg,
    reactions: getReactions(msg.id, userId)
  }));
}

function getReactions(messageId, currentUserId) {
  const rows = db.prepare(`
    SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
    FROM reactions WHERE message_id = ?
    GROUP BY emoji
  `).all(messageId);
  return rows.map(r => ({
    emoji: r.emoji,
    count: r.count,
    reacted: r.user_ids.split(',').includes(currentUserId)
  }));
}

app.get('/api/channels/:id/messages', authMiddleware, (req, res) => {
  const messages = getMessagesQuery('m.channel_id = ?', [req.params.id], req.user.id);
  res.json(messages);
});

app.get('/api/messages/:id/replies', authMiddleware, (req, res) => {
  const thread = db.prepare(`
    SELECT m.*, u.username, u.display_name, u.avatar_color
    FROM messages m JOIN users u ON m.user_id = u.id
    WHERE (m.id = ? OR m.parent_id = ?) AND m.deleted = 0
    ORDER BY m.created_at ASC
  `).all(req.params.id, req.params.id);
  const withReactions = thread.map(m => ({ ...m, reactions: getReactions(m.id, req.user.id) }));
  res.json(withReactions);
});

// ─── DM Routes ─────────────────────────────────────────────────────────────────
app.get('/api/dm/conversations', authMiddleware, (req, res) => {
  const convos = db.prepare(`
    SELECT dc.id, dc.created_at,
      u.id as other_user_id, u.username, u.display_name, u.avatar_color, u.status, u.status_emoji
    FROM dm_conversations dc
    JOIN dm_participants dp1 ON dc.id = dp1.conversation_id AND dp1.user_id = ?
    JOIN dm_participants dp2 ON dc.id = dp2.conversation_id AND dp2.user_id != ?
    JOIN users u ON dp2.user_id = u.id
    ORDER BY dc.created_at DESC
  `).all(req.user.id, req.user.id);
  res.json(convos);
});

app.post('/api/dm/conversations', authMiddleware, (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  // Check existing
  const existing = db.prepare(`
    SELECT dc.id FROM dm_conversations dc
    JOIN dm_participants dp1 ON dc.id = dp1.conversation_id AND dp1.user_id = ?
    JOIN dm_participants dp2 ON dc.id = dp2.conversation_id AND dp2.user_id = ?
  `).get(req.user.id, user_id);

  if (existing) return res.json(existing);

  const id = uuidv4();
  db.prepare('INSERT INTO dm_conversations (id) VALUES (?)').run(id);
  db.prepare('INSERT INTO dm_participants (conversation_id, user_id) VALUES (?, ?)').run(id, req.user.id);
  db.prepare('INSERT INTO dm_participants (conversation_id, user_id) VALUES (?, ?)').run(id, user_id);
  res.json({ id });
});

app.get('/api/dm/:id/messages', authMiddleware, (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.username, u.display_name, u.avatar_color
    FROM messages m JOIN users u ON m.user_id = u.id
    WHERE m.dm_conversation_id = ? AND m.deleted = 0
    ORDER BY m.created_at ASC LIMIT 100
  `).all(req.params.id);
  const withReactions = messages.map(m => ({ ...m, reactions: getReactions(m.id, req.user.id) }));
  res.json(withReactions);
});

// ─── Search ────────────────────────────────────────────────────────────────────
app.get('/api/search', authMiddleware, (req, res) => {
  const q = req.query.q;
  if (!q || q.length < 2) return res.json([]);

  const results = db.prepare(`
    SELECT m.*, u.username, u.display_name, u.avatar_color,
      c.name as channel_name, c.id as channel_id
    FROM messages m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN channels c ON m.channel_id = c.id
    LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
    WHERE m.content LIKE ? AND m.deleted = 0
      AND (m.channel_id IS NULL OR cm.user_id IS NOT NULL)
    ORDER BY m.created_at DESC LIMIT 20
  `).all(req.user.id, `%${q}%`);
  res.json(results);
});

// ─── Socket.io ─────────────────────────────────────────────────────────────────
const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const { id: userId, username } = socket.user;
  onlineUsers.set(userId, socket.id);
  io.emit('presence:update', { userId, online: true });

  socket.on('channel:join', (channelId) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on('dm:join', (conversationId) => {
    socket.join(`dm:${conversationId}`);
  });

  socket.on('message:send', (data) => {
    const { channel_id, dm_conversation_id, content, parent_id } = data;
    if (!content?.trim()) return;

    const id = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, channel_id, dm_conversation_id, parent_id, user_id, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, channel_id || null, dm_conversation_id || null, parent_id || null, userId, content.trim());

    const message = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar_color,
        (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id) as reply_count
      FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
    `).get(id);

    const msgWithReactions = { ...message, reactions: [] };

    if (channel_id) {
      io.to(`channel:${channel_id}`).emit('message:new', msgWithReactions);
    } else if (dm_conversation_id) {
      io.to(`dm:${dm_conversation_id}`).emit('message:new', msgWithReactions);
    }

    // Update reply count for parent
    if (parent_id) {
      const parent = db.prepare(`
        SELECT m.*, u.username, u.display_name, u.avatar_color,
          (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id) as reply_count
        FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
      `).get(parent_id);
      if (parent && parent.channel_id) {
        io.to(`channel:${parent.channel_id}`).emit('message:updated', { ...parent, reactions: getReactions(parent.id, userId) });
      }
    }
  });

  socket.on('message:edit', (data) => {
    const { id, content } = data;
    const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND user_id = ?').get(id, userId);
    if (!msg) return;
    db.prepare('UPDATE messages SET content = ?, edited = 1 WHERE id = ?').run(content, id);
    const updated = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar_color,
        (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id) as reply_count
      FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
    `).get(id);
    const msgWithReactions = { ...updated, reactions: getReactions(id, userId) };
    if (updated.channel_id) io.to(`channel:${updated.channel_id}`).emit('message:updated', msgWithReactions);
    else if (updated.dm_conversation_id) io.to(`dm:${updated.dm_conversation_id}`).emit('message:updated', msgWithReactions);
  });

  socket.on('message:delete', (data) => {
    const { id } = data;
    const msg = db.prepare('SELECT * FROM messages WHERE id = ? AND user_id = ?').get(id, userId);
    if (!msg) return;
    db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?').run(id);
    if (msg.channel_id) io.to(`channel:${msg.channel_id}`).emit('message:deleted', { id });
    else if (msg.dm_conversation_id) io.to(`dm:${msg.dm_conversation_id}`).emit('message:deleted', { id });
  });

  socket.on('reaction:toggle', (data) => {
    const { message_id, emoji } = data;
    const existing = db.prepare('SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?')
      .get(message_id, userId, emoji);

    if (existing) {
      db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
    } else {
      db.prepare('INSERT INTO reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), message_id, userId, emoji);
    }

    const msg = db.prepare('SELECT channel_id, dm_conversation_id FROM messages WHERE id = ?').get(message_id);
    if (!msg) return;

    const reactions = getReactions(message_id, userId);
    const payload = { message_id, reactions };

    if (msg.channel_id) {
      // Broadcast to all in channel, but reactions need per-user reacted state
      const roomSockets = io.sockets.adapter.rooms.get(`channel:${msg.channel_id}`) || new Set();
      roomSockets.forEach(sockId => {
        const sock = io.sockets.sockets.get(sockId);
        if (sock) {
          const reactingUserId = sock.user?.id;
          io.to(sockId).emit('reaction:updated', {
            message_id,
            reactions: getReactions(message_id, reactingUserId)
          });
        }
      });
    } else if (msg.dm_conversation_id) {
      const roomSockets = io.sockets.adapter.rooms.get(`dm:${msg.dm_conversation_id}`) || new Set();
      roomSockets.forEach(sockId => {
        const sock = io.sockets.sockets.get(sockId);
        if (sock) {
          io.to(sockId).emit('reaction:updated', {
            message_id,
            reactions: getReactions(message_id, sock.user?.id)
          });
        }
      });
    }
  });

  socket.on('typing:start', (data) => {
    const room = data.channel_id ? `channel:${data.channel_id}` : `dm:${data.dm_conversation_id}`;
    socket.to(room).emit('typing:update', { userId, username, typing: true, ...data });
  });

  socket.on('typing:stop', (data) => {
    const room = data.channel_id ? `channel:${data.channel_id}` : `dm:${data.dm_conversation_id}`;
    socket.to(room).emit('typing:update', { userId, username, typing: false, ...data });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('presence:update', { userId, online: false });
  });
});

// Serve React build in production
const clientBuild = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
