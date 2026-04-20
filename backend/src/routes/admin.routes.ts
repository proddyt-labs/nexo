import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
router.use(requireAuth);

// Só OWNER ou ADMIN de pelo menos 1 workspace (ou verificar role global futura)
// Por ora: qualquer autenticado pode listar usuários para fins de convite
// Operações destrutivas requerem OWNER do workspace

// ── GET /admin/users — lista todos os usuários (para convites)
router.get("/users", async (req, res) => {
  const { search } = req.query;
  const users = await prisma.user.findMany({
    where: search ? {
      OR: [
        { username: { contains: String(search), mode: "insensitive" } },
        { name:     { contains: String(search), mode: "insensitive" } },
        { email:    { contains: String(search), mode: "insensitive" } },
      ],
    } : undefined,
    select: { id: true, username: true, name: true, avatar: true, email: true },
    take: 20,
    orderBy: { name: "asc" },
  });
  res.json(users);
});

// ── GET /admin/workspaces — lista todos os workspaces (visão global, apenas OWNER de algum)
router.get("/workspaces", async (req, res) => {
  // Verifica se é OWNER de pelo menos um workspace
  const isOwner = await prisma.workspaceMember.findFirst({
    where: { userId: req.userId, role: "OWNER" },
  });
  if (!isOwner) return res.status(403).json({ message: "Sem permissão" });

  const workspaces = await prisma.workspace.findMany({
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, name: true, avatar: true, email: true } },
        },
      },
      _count: { select: { notes: true, collections: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(workspaces);
});

// ── GET /workspaces/:workspaceId/members — membros de um workspace
router.get("/workspaces/:workspaceId/members", async (req, res) => {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.userId } },
  });
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN"))
    return res.status(403).json({ message: "Sem permissão" });

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: req.params.workspaceId },
    include: {
      user: { select: { id: true, username: true, name: true, avatar: true, email: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  res.json(members);
});

// ── POST /workspaces/:workspaceId/members — adicionar membro
router.post("/workspaces/:workspaceId/members", async (req, res) => {
  const requester = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.userId } },
  });
  if (!requester || (requester.role !== "OWNER" && requester.role !== "ADMIN"))
    return res.status(403).json({ message: "Sem permissão" });

  const { userId, role = "MEMBER" } = req.body ?? {};
  if (!userId) return res.status(400).json({ message: "userId é obrigatório" });

  // ADMIN não pode adicionar como OWNER
  if (requester.role === "ADMIN" && role === "OWNER")
    return res.status(403).json({ message: "Apenas OWNER pode adicionar outro OWNER" });

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId } },
  });
  if (existing) return res.status(409).json({ message: "Usuário já é membro" });

  const mem = await prisma.workspaceMember.create({
    data: { workspaceId: req.params.workspaceId, userId, role },
    include: {
      user: { select: { id: true, username: true, name: true, avatar: true, email: true } },
    },
  });
  res.status(201).json(mem);
});

// ── PATCH /workspaces/:workspaceId/members/:userId — alterar role
router.patch("/workspaces/:workspaceId/members/:targetUserId", async (req, res) => {
  const requester = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.userId } },
  });
  if (!requester || requester.role !== "OWNER")
    return res.status(403).json({ message: "Apenas OWNER pode alterar roles" });

  if (req.params.targetUserId === req.userId)
    return res.status(400).json({ message: "Não pode alterar sua própria role" });

  const { role } = req.body ?? {};
  if (!["ADMIN", "MEMBER", "VIEWER"].includes(role))
    return res.status(400).json({ message: "Role inválida" });

  const mem = await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.params.targetUserId } },
    data: { role },
    include: {
      user: { select: { id: true, username: true, name: true, avatar: true, email: true } },
    },
  });
  res.json(mem);
});

// ── DELETE /workspaces/:workspaceId/members/:userId — remover membro
router.delete("/workspaces/:workspaceId/members/:targetUserId", async (req, res) => {
  const requester = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.userId } },
  });
  if (!requester || (requester.role !== "OWNER" && requester.role !== "ADMIN"))
    return res.status(403).json({ message: "Sem permissão" });

  if (req.params.targetUserId === req.userId)
    return res.status(400).json({ message: "Não pode remover a si mesmo" });

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.params.targetUserId } },
  });
  res.status(204).send();
});

export default router;
