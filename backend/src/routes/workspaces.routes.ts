import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
router.use(requireAuth);

// ── GET /workspaces — lista workspaces do usuário (admin vê todos)
router.get("/", async (req, res) => {
  const where = req.isAdmin ? {} : { members: { some: { userId: req.userId } } };
  const workspaces = await prisma.workspace.findMany({
    where,
    include: {
      members: { select: { userId: true, role: true } },
      _count: { select: { notes: true, collections: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(workspaces);
});

// ── POST /workspaces — cria workspace e adiciona criador como OWNER
router.post("/", async (req, res) => {
  const { name, description, icon } = req.body ?? {};
  if (!name) return res.status(400).json({ message: "name é obrigatório" });

  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();

  const workspace = await prisma.workspace.create({
    data: {
      name, slug, description, icon,
      members: { create: { userId: req.userId, role: "OWNER" } },
    },
    include: { members: { select: { userId: true, role: true } } },
  });
  res.status(201).json(workspace);
});

// ── GET /workspaces/:workspaceId
router.get("/:workspaceId", async (req, res) => {
  if (!req.isAdmin) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ message: "Sem acesso" });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: req.params.workspaceId },
    include: {
      members: { include: { user: { select: { id: true, name: true, username: true, avatar: true } } } },
      collections: { orderBy: [{ parentId: "asc" }, { position: "asc" }] },
      _count: { select: { notes: true } },
    },
  });
  if (!workspace) return res.status(404).json({ message: "Workspace não encontrado" });
  res.json(workspace);
});

// ── PATCH /workspaces/:workspaceId
router.patch("/:workspaceId", async (req, res) => {
  if (!req.isAdmin) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.userId } },
    });
    if (!member || !["OWNER", "ADMIN"].includes(member.role))
      return res.status(403).json({ message: "Sem permissão" });
  }

  const { name, description, icon } = req.body ?? {};
  const workspace = await prisma.workspace.update({
    where: { id: req.params.workspaceId },
    data: { ...(name && { name }), ...(description !== undefined && { description }), ...(icon && { icon }) },
  });
  res.json(workspace);
});

// ── POST /workspaces/:workspaceId/members — convida membro
router.post("/:workspaceId/members", async (req, res) => {
  if (!req.isAdmin) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.userId } },
    });
    if (!member || !["OWNER", "ADMIN"].includes(member.role))
      return res.status(403).json({ message: "Sem permissão" });
  }

  const { usernameOrEmail, role = "MEMBER" } = req.body ?? {};
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }] },
    select: { id: true, name: true, username: true, email: true },
  });
  if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: user.id } },
  });
  if (existing) return res.status(409).json({ message: "Usuário já é membro" });

  const newMember = await prisma.workspaceMember.create({
    data: { workspaceId: req.params.workspaceId, userId: user.id, role },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
  });
  res.status(201).json(newMember);
});

// ── DELETE /workspaces/:workspaceId/members/:userId
router.delete("/:workspaceId/members/:userId", async (req, res) => {
  const isSelf = req.params.userId === req.userId;
  if (!req.isAdmin) {
    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.userId } },
    });
    if (!requester || (!isSelf && !["OWNER", "ADMIN"].includes(requester.role)))
      return res.status(403).json({ message: "Sem permissão" });
  }

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.params.userId } },
  });
  res.status(204).send();
});

export default router;
