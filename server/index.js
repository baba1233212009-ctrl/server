require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);

// Socket.io presence & messaging
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('user:online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('presence:update', Array.from(onlineUsers.keys()));
  });

  socket.on('chat:message', (payload) => {
    const { to, chatId, message, fromId } = payload;
    const targetSocket = onlineUsers.get(String(to));
    if (targetSocket) io.to(targetSocket).emit('chat:message', payload);
    io.to(socket.id).emit('chat:message', payload);
  });

  socket.on('typing', (payload) => {
    const { to } = payload;
    const targetSocket = onlineUsers.get(String(to));
    if (targetSocket) io.to(targetSocket).emit('typing', payload);
  });

  socket.on('disconnect', () => {
    for (const [userId, sId] of onlineUsers.entries()) {
      if (sId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('presence:update', Array.from(onlineUsers.keys()));
  });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL via Prisma');
    server.listen(PORT, () => console.log('Server running on', PORT));
  } catch (err) {
    console.error('Failed to connect to DB', err);
  }
}

start();
