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

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  position: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, username: true, avatar: true } },
  assignee: { select: { id: true, name: true, username: true, avatar: true } },
};

// ── GET /workspaces/:workspaceId/tasks
router.get("/", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId))
    return res.status(403).json({ message: "Sem acesso" });

  const { status, assigneeId, grouped } = req.query;

  const tasks = await prisma.task.findMany({
    where: {
      workspaceId: req.params.workspaceId,
      ...(status ? { status: String(status) as any } : {}),
      ...(assigneeId ? { assigneeId: String(assigneeId) } : {}),
    },
    select: TASK_SELECT,
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });

  if (grouped === "true") {
    const byStatus: Record<string, typeof tasks> = {};
    for (const task of tasks) {
      if (!byStatus[task.status]) byStatus[task.status] = [];
      byStatus[task.status].push(task);
    }
    return res.json(byStatus);
  }

  res.json(tasks);
});

// ── POST /workspaces/:workspaceId/tasks
router.post("/", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  const { title, description, status, priority, position, assigneeId, dueDate } = req.body ?? {};
  if (!title) return res.status(400).json({ message: "title é obrigatório" });

  const task = await prisma.task.create({
    data: {
      workspaceId: req.params.workspaceId,
      authorId: req.userId,
      title,
      ...(description !== undefined && { description }),
      ...(status !== undefined      && { status }),
      ...(priority !== undefined    && { priority }),
      ...(position !== undefined    && { position }),
      ...(assigneeId !== undefined  && { assigneeId }),
      ...(dueDate !== undefined     && { dueDate: new Date(dueDate) }),
    },
    select: TASK_SELECT,
  });
  res.status(201).json(task);
});

// ── PATCH /workspaces/:workspaceId/tasks/:id
router.patch("/:id", async (req, res) => {
  const { workspaceId, id } = req.params as Record<string, string>;
  if (!await assertMember(workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  const { title, description, status, priority, position, assigneeId, dueDate } = req.body ?? {};

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined       && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined      && { status }),
      ...(priority !== undefined    && { priority }),
      ...(position !== undefined    && { position }),
      ...(assigneeId !== undefined  && { assigneeId: assigneeId || null }),
      ...(dueDate !== undefined     && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
    select: TASK_SELECT,
  });
  res.json(task);
});

// ── DELETE /workspaces/:workspaceId/tasks/:id
router.delete("/:id", async (req, res) => {
  const { workspaceId, id } = req.params as Record<string, string>;
  const member = await assertMember(workspaceId, req.userId, true);
  if (!member) return res.status(403).json({ message: "Sem permissão" });

  const task = await prisma.task.findFirst({
    where: { id, workspaceId },
    select: { authorId: true },
  });
  if (!task) return res.status(404).json({ message: "Task não encontrada" });

  const canDelete =
    member.role === "OWNER" ||
    member.role === "ADMIN" ||
    task.authorId === req.userId;

  if (!canDelete) return res.status(403).json({ message: "Sem permissão para deletar" });

  await prisma.task.delete({ where: { id } });
  res.status(204).send();
});

// ── POST /workspaces/:workspaceId/tasks/reorder
router.post("/reorder", async (req, res) => {
  const { workspaceId } = req.params as Record<string, string>;
  if (!await assertMember(workspaceId, req.userId, true))
    return res.status(403).json({ message: "Sem permissão" });

  const { tasks } = req.body ?? {};
  if (!Array.isArray(tasks)) return res.status(400).json({ message: "tasks deve ser um array" });

  await prisma.$transaction(
    tasks.map(({ id, status, position }: { id: string; status?: string; position: number }) =>
      prisma.task.update({
        where: { id },
        data: {
          position,
          ...(status !== undefined && { status: status as any }),
        },
      })
    )
  );

  res.json({ ok: true });
});

export default router;
