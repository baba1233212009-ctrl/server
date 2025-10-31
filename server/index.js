import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());

// Регистрация
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Заполните все поля" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: "Email уже зарегистрирован" });

    const user = await prisma.user.create({
      data: { name, email, password }
    });

    return res.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Логин
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Заполните все поля" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Неверный email или пароль" });
    }

    // Простая имитация токена (замени на JWT при необходимости)
    const token = '${user.id}.${user.email}.${Date.now()}';

    return res.json({ token, id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Тестовый GET /me
app.get("/api/users/me", async (req, res) => {
  res.json({ message: "Сервер работает!" });
});

const PORT = process.env.PORT || 10000;

// Подключение к базе и запуск сервера
async function start() {
  try {
    await prisma.$connect();
    console.log("Connected to DB. Server running on port", PORT);
    app.listen(PORT);
  } catch (err) {
    console.error("Failed to connect to DB:", err);
  }
}

start();
