import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";

import authRoutes        from "./routes/auth.routes";
import workspacesRoutes  from "./routes/workspaces.routes";
import collectionsRoutes from "./routes/collections.routes";
import notesRoutes       from "./routes/notes.routes";
import dailyRoutes       from "./routes/daily.routes";
import tagsRoutes        from "./routes/tags.routes";
import tasksRoutes       from "./routes/tasks.routes";
import adminRoutes       from "./routes/admin.routes";
import importExportRoutes from "./routes/importexport.routes";

const app    = express();
const server = createServer(app);

// ── Socket.io (real-time)
const io = new SocketServer(server, {
  cors: { origin: process.env.FRONTEND_URL ?? "*", credentials: true },
});

io.on("connection", (socket) => {
  // Entra numa sala de nota (para edição colaborativa futura)
  socket.on("note:join", (noteId: string) => socket.join(`note:${noteId}`));
  socket.on("note:leave", (noteId: string) => socket.leave(`note:${noteId}`));

  // Broadcast de mudanças de conteúdo para outros editores
  socket.on("note:update", ({ noteId, content }: { noteId: string; content: string }) => {
    socket.to(`note:${noteId}`).emit("note:updated", { noteId, content });
  });

  // Presença: quem está editando
  socket.on("note:presence", ({ noteId, user }: { noteId: string; user: object }) => {
    socket.to(`note:${noteId}`).emit("note:presence", { user });
  });
});

// ── Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL ?? "*",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// ── Health
app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ── Routes
app.use("/api/auth",                              authRoutes);
app.use("/api/workspaces",                        workspacesRoutes);
app.use("/api/workspaces/:workspaceId/collections", collectionsRoutes);
app.use("/api/workspaces/:workspaceId/notes",       notesRoutes);
app.use("/api/workspaces/:workspaceId/daily",       dailyRoutes);
app.use("/api/workspaces/:workspaceId/tags",        tagsRoutes);
app.use("/api/workspaces/:workspaceId/tasks",      tasksRoutes);
app.use("/api/admin",                              adminRoutes);

app.use("/api/workspaces/:workspaceId", importExportRoutes);

// ── Graph endpoint — retorna todos os nós e arestas do workspace
app.get("/api/workspaces/:workspaceId/graph", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token ausente" });
  const { prisma } = await import("./lib/prisma");
  const { verifyGateToken } = await import("./middleware/auth.middleware");
  const result = await verifyGateToken(token);
  if (!result) return res.status(401).json({ message: "Token inválido" });
  const userId = result.userId;

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId } },
  });
  if (!member) return res.status(403).json({ message: "Sem acesso" });

  const [notes, links] = await Promise.all([
    prisma.note.findMany({
      where: { workspaceId: req.params.workspaceId },
      select: { id: true, title: true, emoji: true, collectionId: true, tags: { include: { tag: true } } },
    }),
    prisma.noteLink.findMany({
      where: { from: { workspaceId: req.params.workspaceId } },
      select: { fromId: true, toId: true },
    }),
  ]);

  res.json({
    nodes: notes.map(n => ({
      id: n.id,
      label: n.title || "Sem título",
      emoji: n.emoji,
      collectionId: n.collectionId,
      tags: n.tags.map(t => t.tag),
    })),
    edges: links.map(l => ({ source: l.fromId, target: l.toId })),
  });
});

// ── Start
const PORT = Number(process.env.PORT ?? 3200);
server.listen(PORT, () => {
  console.log(`[Nexo API] rodando na porta ${PORT}`);
});

export { io };
