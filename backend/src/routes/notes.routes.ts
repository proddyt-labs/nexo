import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });
router.use(requireAuth);

async function assertMember(workspaceId: string, userId: string, write = false) {
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!m) return null;
  if (write && m.role === "VIEWER") return null;
  return m;
}

const NOTE_SELECT = {
  id: true, title: true, emoji: true, isPinned: true, isPublished: true,
  collectionId: true, position: true, createdAt: true, updatedAt: true,
  author: { select: { id: true, name: true, username: true, avatar: true } },
  tags: { include: { tag: true } },
  _count: { select: { comments: true, linksFrom: true, linksTo: true } },
};

// content é String no DB → serializa/desserializa JSON
function serializeContent(c: any): string {
  if (!c) return "";
  return typeof c === "string" ? c : JSON.stringify(c);
}
function parseContent(c: string | null): any {
  if (!c) return null;
  try { return JSON.parse(c); } catch { return c; }
}
function parseNote(n: any) {
  if (!n) return n;
  return { ...n, content: parseContent(n.content) };
}

// ── GET /workspaces/:workspaceId/notes
router.get("/", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId))
    return res.status(403).json({ message: "Sem acesso" });

  const { collectionId, search, pinned } = req.query;
  const notes = await prisma.note.findMany({
    where: {
      workspaceId: req.params.workspaceId,
      ...(collectionId ? { collectionId: String(collectionId) } : {}),
      ...(pinned === "true" ? { isPinned: true } : {}),
      ...(search ? { title: { contains: String(search), mode: "insensitive" } } : {}),
    },
    select: NOTE_SELECT,
    orderBy: [{ isPinned: "desc" }, { position: "asc" }, { updatedAt: "desc" }],
  });
  res.json(notes.map(parseNote));
});

// ── POST /workspaces/:workspaceId/notes
router.post("/", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  const { title, content, emoji, collectionId } = req.body ?? {};
  const note = await prisma.note.create({
    data: {
      workspaceId: req.params.workspaceId,
      authorId: req.userId,
      title: title || "Sem título",
      content: serializeContent(content),
      emoji,
      collectionId: collectionId ?? null,
    },
    select: { ...NOTE_SELECT, content: true },
  });
  res.status(201).json(parseNote(note));
});

// ── GET /workspaces/:workspaceId/notes/:id
router.get("/:id", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId))
    return res.status(403).json({ message: "Sem acesso" });

  const note = await prisma.note.findFirst({
    where: { id: req.params.id, workspaceId: req.params.workspaceId },
    include: {
      author: { select: { id: true, name: true, username: true, avatar: true } },
      tags: { include: { tag: true } },
      linksFrom: { include: { to: { select: { id: true, title: true, emoji: true } } } },
      linksTo:   { include: { from: { select: { id: true, title: true, emoji: true } } } },
      comments:  { include: { author: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!note) return res.status(404).json({ message: "Nota não encontrada" });
  res.json(parseNote(note));
});

// ── PATCH /workspaces/:workspaceId/notes/:id
router.patch("/:id", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  const { title, content, emoji, collectionId, isPinned, isPublished, position } = req.body ?? {};
  const note = await prisma.note.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined     && { title }),
      ...(content !== undefined   && { content: serializeContent(content) }),
      ...(emoji !== undefined     && { emoji }),
      ...(collectionId !== undefined && { collectionId }),
      ...(isPinned !== undefined  && { isPinned }),
      ...(isPublished !== undefined && { isPublished }),
      ...(position !== undefined  && { position }),
    },
    select: { ...NOTE_SELECT, content: true },
  });
  res.json(parseNote(note));
});

// ── DELETE /workspaces/:workspaceId/notes/:id
router.delete("/:id", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  await prisma.note.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ── POST /workspaces/:workspaceId/notes/:id/links — cria link entre notas
router.post("/:id/links", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  const { toId } = req.body ?? {};
  if (!toId) return res.status(400).json({ message: "toId é obrigatório" });

  const link = await prisma.noteLink.upsert({
    where:  { fromId_toId: { fromId: req.params.id, toId } },
    create: { fromId: req.params.id, toId },
    update: {},
  });
  res.status(201).json(link);
});

// ── DELETE /workspaces/:workspaceId/notes/:id/links/:toId
router.delete("/:id/links/:toId", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  await prisma.noteLink.deleteMany({
    where: { fromId: req.params.id, toId: req.params.toId },
  });
  res.status(204).send();
});

// ── POST /workspaces/:workspaceId/notes/:id/comments
router.post("/:id/comments", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId))
    return res.status(403).json({ message: "Sem acesso" });

  const { content } = req.body ?? {};
  if (!content) return res.status(400).json({ message: "content é obrigatório" });

  const comment = await prisma.comment.create({
    data: { noteId: req.params.id, authorId: req.userId, content },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });
  res.status(201).json(comment);
});

export default router;
