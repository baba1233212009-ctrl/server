const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'No token' });
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

router.post('/', auth, async (req, res) => {
  const { participantId } = req.body;
  // find or create one-to-one chat
  let chat = await prisma.chat.findFirst({
    where: { isGroup: false, members: { some: { userId: req.userId } } },
    include: { members: true }
  });
  // simple create for demonstration
  chat = await prisma.chat.create({ data: { isGroup: false, members: { create: [{ userId: req.userId }, { userId: parseInt(participantId) }] } }, include: { members: true }});
  res.json(chat);
});

router.get('/', auth, async (req, res) => {
  const chats = await prisma.chat.findMany({ where: { members: { some: { userId: req.userId } } }, include: { members: { include: { user: true } } }});
  res.json(chats);
});

router.get('/:chatId/messages', auth, async (req, res) => {
  const chatId = parseInt(req.params.chatId);
  const msgs = await prisma.message.findMany({ where: { chatId }, include: { from: true }, orderBy: { createdAt: 'asc' }, take: 100 });
  res.json(msgs);
});

router.post('/:chatId/messages', auth, async (req, res) => {
  const chatId = parseInt(req.params.chatId);
  const { text, attachments } = req.body;
  const msg = await prisma.message.create({ data: { chatId, fromId: req.userId, text, attachments: attachments || [] }, include: { from: true }});
  res.json(msg);
});

router.post('/:chatId/reactions', auth, async (req, res) => {
  const { messageId, emoji } = req.body;
  const reaction = await prisma.reaction.create({ data: { emoji, byId: req.userId, messageId: parseInt(messageId) }});
  res.json(reaction);
});

module.exports = router;
