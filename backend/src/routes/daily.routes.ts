import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });
router.use(requireAuth);

function serializeContent(c: any): string {
  if (!c) return "";
  return typeof c === "string" ? c : JSON.stringify(c);
}
function parseContent(c: string | null): any {
  if (!c) return null;
  try { return JSON.parse(c); } catch { return c; }
}
function parseDaily(d: any) {
  return d ? { ...d, content: parseContent(d.content) } : d;
}

async function assertMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

// ── GET /workspaces/:workspaceId/daily?date=YYYY-MM-DD
// Retorna ou cria automaticamente a daily note do dia
router.get("/", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId))
    return res.status(403).json({ message: "Sem acesso" });

  const dateStr = req.query.date ? String(req.query.date) : new Date().toISOString().split("T")[0];
  const date    = new Date(dateStr + "T12:00:00Z"); // fixa horário para evitar drift de timezone

  const daily = await prisma.dailyNote.upsert({
    where: {
      workspaceId_authorId_date: {
        workspaceId: req.params.workspaceId,
        authorId:    req.userId,
        date,
      },
    },
    create: {
      workspaceId: req.params.workspaceId,
      authorId:    req.userId,
      date,
      content:     "",
    },
    update: {},
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });

  res.json(parseDaily(daily));
});

// ── PATCH /workspaces/:workspaceId/daily/:id — salva conteúdo
router.patch("/:id", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId))
    return res.status(403).json({ message: "Sem acesso" });

  const { content } = req.body ?? {};
  const daily = await prisma.dailyNote.update({
    where:  { id: req.params.id },
    data:   { content: serializeContent(content) },
  });
  res.json(parseDaily(daily));
});

// ── GET /workspaces/:workspaceId/daily/all?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/all", async (req, res) => {
  if (!await assertMember(req.params.workspaceId, req.userId))
    return res.status(403).json({ message: "Sem acesso" });

  const { from, to } = req.query;
  const dailies = await prisma.dailyNote.findMany({
    where: {
      workspaceId: req.params.workspaceId,
      authorId:    req.userId,
      ...(from || to ? {
        date: {
          ...(from ? { gte: new Date(String(from) + "T00:00:00Z") } : {}),
          ...(to   ? { lte: new Date(String(to)   + "T23:59:59Z") } : {}),
        },
      } : {}),
    },
    orderBy: { date: "desc" },
    select:  { id: true, date: true, content: true, updatedAt: true },
  });
  res.json(dailies.map(parseDaily));
});

export default router;
