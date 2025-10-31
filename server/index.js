import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());

// Автоматическое применение миграций при старте
exec("npx prisma migrate deploy", (error, stdout, stderr) => {
  if (error) console.error(`Migration error: ${error.message}`);
  if (stderr) console.error(`Migration stderr: ${stderr}`);
  console.log(`Migration success:\n${stdout}`);
});

// Регистрация
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name⠟⠺⠺⠟⠵⠞⠺⠺⠟⠺!password) return res.status(400).json({ message: "Заполните все поля" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ message: "Email уже зарегистрирован" });

  const user = await prisma.user.create({ data: { name, email, password } });
  res.status(201).json({ id: user.id, name: user.name, email: user.email });
});

// Тестовый GET
app.get("/api/users/me", async (req, res) => {
  res.json({ message: "Сервер работает!" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log(`Connected to DB. Server running on port ${PORT}`);
  } catch (err) {
    console.error("Failed to connect to DB:", err);
  }
});
