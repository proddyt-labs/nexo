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

// ── GET /workspaces/:workspaceId/tags
router.get("/", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId))
    return res.status(403).json({ message: "Sem acesso" });

  const tags = await prisma.tag.findMany({
    where: { workspaceId: req.params.workspaceId },
    include: { _count: { select: { notes: true } } },
    orderBy: { name: "asc" },
  });
  res.json(tags);
});

// ── POST /workspaces/:workspaceId/tags
router.post("/", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  const { name, color } = req.body ?? {};
  if (!name) return res.status(400).json({ message: "name é obrigatório" });

  const tag = await prisma.tag.upsert({
    where:  { workspaceId_name: { workspaceId: req.params.workspaceId, name } },
    create: { workspaceId: req.params.workspaceId, name, color: color ?? "#60a5fa" },
    update: { ...(color && { color }) },
  });
  res.status(201).json(tag);
});

// ── POST /workspaces/:workspaceId/notes/:noteId/tags — vincula tag a nota
router.post("/notes/:noteId", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  const { tagId } = req.body ?? {};
  if (!tagId) return res.status(400).json({ message: "tagId é obrigatório" });

  await prisma.noteTag.upsert({
    where:  { noteId_tagId: { noteId: req.params.noteId, tagId } },
    create: { noteId: req.params.noteId, tagId },
    update: {},
  });
  res.status(201).json({ noteId: req.params.noteId, tagId });
});

// ── DELETE /workspaces/:workspaceId/notes/:noteId/tags/:tagId
router.delete("/notes/:noteId/:tagId", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  await prisma.noteTag.deleteMany({
    where: { noteId: req.params.noteId, tagId: req.params.tagId },
  });
  res.status(204).send();
});

export default router;
