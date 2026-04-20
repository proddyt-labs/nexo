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

// ── GET /workspaces/:workspaceId/collections
router.get("/", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId))
    return res.status(403).json({ message: "Sem acesso" });

  const collections = await prisma.collection.findMany({
    where: { workspaceId: req.params.workspaceId },
    include: { _count: { select: { notes: true, children: true } } },
    orderBy: [{ parentId: "asc" }, { position: "asc" }],
  });
  res.json(collections);
});

// ── POST /workspaces/:workspaceId/collections
router.post("/", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  const { name, icon, color, parentId } = req.body ?? {};
  if (!name) return res.status(400).json({ message: "name é obrigatório" });

  const collection = await prisma.collection.create({
    data: { workspaceId: req.params.workspaceId, name, icon, color, parentId: parentId ?? null },
  });
  res.status(201).json(collection);
});

// ── PATCH /workspaces/:workspaceId/collections/:id
router.patch("/:id", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  const { name, icon, color, parentId, position } = req.body ?? {};
  const collection = await prisma.collection.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
      ...(parentId !== undefined && { parentId }),
      ...(position !== undefined && { position }),
    },
  });
  res.json(collection);
});

// ── DELETE /workspaces/:workspaceId/collections/:id
router.delete("/:id", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  await prisma.collection.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
