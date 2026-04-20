import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { signToken, requireAuth } from "../middleware/auth.middleware";

const router = Router();

// ── POST /auth/register
router.post("/register", async (req, res) => {
  const { username, email, password, name } = req.body ?? {};
  if (!username || !email || !password || !name)
    return res.status(400).json({ message: "username, email, password e name são obrigatórios" });

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (exists) return res.status(409).json({ message: "username ou email já em uso" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, passwordHash, name },
    select: { id: true, username: true, email: true, name: true, createdAt: true },
  });

  const token = signToken(user.id);
  res.status(201).json({ token, user });
});

// ── POST /auth/login
router.post("/login", async (req, res) => {
  const { login, password } = req.body ?? {};
  if (!login || !password)
    return res.status(400).json({ message: "login e password são obrigatórios" });

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: login }, { username: login }] },
  });
  if (!user) return res.status(401).json({ message: "Credenciais inválidas" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Credenciais inválidas" });

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, name: user.name, avatar: user.avatar },
  });
});

// ── GET /auth/me
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, username: true, email: true, name: true, avatar: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
  res.json(user);
});

// ── PATCH /auth/me
router.patch("/me", requireAuth, async (req, res) => {
  const { name, avatar } = req.body ?? {};
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { ...(name && { name }), ...(avatar && { avatar }) },
    select: { id: true, username: true, email: true, name: true, avatar: true },
  });
  res.json(user);
});

export default router;
