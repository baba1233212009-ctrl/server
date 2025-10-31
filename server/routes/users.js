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

router.get('/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }});
  res.json(user);
});

router.get('/search', auth, async (req, res) => {
  const q = req.query.q || '';
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } }
      ]
    },
    take: 20,
    select: { id: true, name: true, email: true, avatar: true, status: true }
  });
  res.json(users);
});

router.post('/contacts/:id', auth, async (req, res) => {
  const otherId = parseInt(req.params.id);
  await prisma.contact.create({ data: { ownerId: req.userId, contactId: otherId }});
  res.json({ success: true });
});

router.delete('/contacts/:id', auth, async (req, res) => {
  const otherId = parseInt(req.params.id);
  await prisma.contact.deleteMany({ where: { ownerId: req.userId, contactId: otherId }});
  res.json({ success: true });
});

module.exports = router;
