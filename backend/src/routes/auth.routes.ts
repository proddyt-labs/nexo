import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

const GATE_URL = process.env.GATE_URL ?? "http://localhost:3100";
const CLIENT_ID = process.env.GATE_CLIENT_ID ?? "nexo";
const CLIENT_SECRET = process.env.GATE_CLIENT_SECRET ?? "";

// Troca o authorization code do Gate por um access_token.
// Mantém GATE_CLIENT_SECRET no backend — nunca exposto ao browser.
router.post("/callback", async (req, res) => {
  const { code, redirectUri } = req.body as { code?: string; redirectUri?: string };
  if (!code) return res.status(400).json({ message: "code obrigatório" });

  try {
    const resp = await fetch(`${GATE_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    const data = (await resp.json()) as { access_token?: string; error?: string };
    if (!resp.ok) {
      return res.status(400).json({ message: data.error ?? "Token exchange failed" });
    }

    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error("Token exchange error:", err);
    res.status(500).json({ message: "Erro interno" });
  }
});

// GET /auth/me — perfil do usuário autenticado
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, username: true, email: true, name: true, avatar: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
  res.json(user);
});

// PATCH /auth/me — atualiza name/avatar
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
