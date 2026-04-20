import { Router, Request, Response } from "express";
import multer from "multer";
import archiver from "archiver";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage() });

async function assertMember(workspaceId: string, userId: string, write = false) {
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!m) return null;
  if (write && m.role === "VIEWER") return null;
  return m;
}

// ── POST /workspaces/:workspaceId/import
router.post("/import", upload.any(), async (req: Request, res: Response) => {
  const member = await assertMember(req.params.workspaceId, req.userId, true);
  if (!member) return res.status(403).json({ message: "Sem permissão" });

  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files || files.length === 0)
    return res.status(400).json({ message: "Nenhum arquivo enviado" });

  const workspaceId = req.params.workspaceId;
  let importedCount = 0;
  let collectionsCreated = 0;

  // Cache de collections por "parentId|name" para evitar upserts redundantes
  const collectionCache = new Map<string, string>();

  async function upsertCollection(name: string, parentId: string | null): Promise<string> {
    const cacheKey = `${parentId ?? ""}|${name}`;
    if (collectionCache.has(cacheKey)) return collectionCache.get(cacheKey)!;

    const existing = await prisma.collection.findFirst({
      where: { workspaceId, name, parentId: parentId ?? null },
    });

    if (existing) {
      collectionCache.set(cacheKey, existing.id);
      return existing.id;
    }

    const created = await prisma.collection.create({
      data: { workspaceId, name, parentId: parentId ?? null },
    });
    collectionsCreated++;
    collectionCache.set(cacheKey, created.id);
    return created.id;
  }

  for (const file of files) {
    const originalName = file.originalname; // e.g. "03 - Home Lab/homelab.md"
    const parts = originalName.replace(/\\/g, "/").split("/");
    const filename = parts[parts.length - 1];
    const folderParts = parts.slice(0, -1);

    // Resolve title from filename (strip .md)
    const title = filename.endsWith(".md")
      ? filename.slice(0, -3)
      : filename;

    // Resolve collection hierarchy
    let parentId: string | null = null;
    for (const folder of folderParts) {
      if (!folder) continue;
      parentId = await upsertCollection(folder, parentId);
    }

    const rawMarkdown = file.buffer.toString("utf-8");
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: rawMarkdown }],
        },
      ],
    });

    await prisma.note.create({
      data: {
        workspaceId,
        authorId: req.userId,
        title,
        content,
        collectionId: parentId ?? null,
      },
    });
    importedCount++;
  }

  res.json({ imported: importedCount, collections: collectionsCreated });
});

// ── POST /workspaces/:workspaceId/import-json — bulk import via JSON (script server-side)
// Body: { files: [{ path: "folder/sub/note.md", content: "markdown..." }] }
router.post("/import-json", async (req: Request, res: Response) => {
  const member = await assertMember(req.params.workspaceId, req.userId, true);
  if (!member) return res.status(403).json({ message: "Sem permissão" });

  const { files } = req.body as { files: { path: string; content: string }[] };
  if (!Array.isArray(files) || !files.length)
    return res.status(400).json({ message: "files[] é obrigatório" });

  const workspaceId = req.params.workspaceId;
  let importedCount = 0, collectionsCreated = 0;
  const collectionCache = new Map<string, string>();

  async function upsertCollection(name: string, parentId: string | null): Promise<string> {
    const key = `${parentId ?? ""}|${name}`;
    if (collectionCache.has(key)) return collectionCache.get(key)!;
    const existing = await prisma.collection.findFirst({
      where: { workspaceId, name, parentId: parentId ?? null },
    });
    if (existing) { collectionCache.set(key, existing.id); return existing.id; }
    const created = await prisma.collection.create({
      data: { workspaceId, name, parentId: parentId ?? null, position: 0 },
    });
    collectionsCreated++;
    collectionCache.set(key, created.id);
    return created.id;
  }

  for (const f of files) {
    const parts      = f.path.replace(/\\/g, "/").split("/").filter(Boolean);
    const filename   = parts[parts.length - 1];
    const folders    = parts.slice(0, -1);
    const title      = filename.endsWith(".md") ? filename.slice(0, -3) : filename;

    let parentId: string | null = null;
    for (const folder of folders) parentId = await upsertCollection(folder, parentId);

    const content = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: f.content }] }],
    });

    await prisma.note.create({
      data: { workspaceId, authorId: req.userId, title, content, collectionId: parentId },
    });
    importedCount++;
  }

  res.json({ imported: importedCount, collections: collectionsCreated });
});

// ── GET /workspaces/:workspaceId/export
router.get("/export", async (req: Request, res: Response) => {
  const member = await assertMember(req.params.workspaceId, req.userId);
  if (!member) return res.status(403).json({ message: "Sem acesso" });

  const workspaceId = req.params.workspaceId;

  // Fetch all collections for this workspace
  const collections = await prisma.collection.findMany({
    where: { workspaceId },
    select: { id: true, name: true, parentId: true },
  });

  // Build a map id -> collection for quick lookup
  const colMap = new Map(collections.map((c) => [c.id, c]));

  // Resolve full folder path for a collection id
  function resolveCollectionPath(collectionId: string | null): string {
    if (!collectionId) return "";
    const segments: string[] = [];
    let current: { id: string; name: string; parentId: string | null } | undefined =
      colMap.get(collectionId);
    while (current) {
      segments.unshift(current.name);
      current = current.parentId ? colMap.get(current.parentId) : undefined;
    }
    return segments.join("/");
  }

  // Fetch all notes with content
  const notes = await prisma.note.findMany({
    where: { workspaceId },
    select: { id: true, title: true, content: true, collectionId: true },
  });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="nexo-export.zip"'
  );

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(res);

  for (const note of notes) {
    const folderPath = resolveCollectionPath(note.collectionId);
    const safeName = (note.title || "sem-titulo").replace(/[/\\?%*:|"<>]/g, "-");
    const filePath = folderPath ? `${folderPath}/${safeName}.md` : `${safeName}.md`;

    // Extract plain text from content (stored as TipTap JSON string)
    let markdown = "";
    if (note.content) {
      try {
        const doc = JSON.parse(note.content);
        // Walk the doc tree collecting text nodes
        function extractText(node: any): string {
          if (node.type === "text") return node.text ?? "";
          if (node.content && Array.isArray(node.content))
            return node.content.map(extractText).join("");
          return "";
        }
        markdown = extractText(doc);
      } catch {
        markdown = note.content;
      }
    }

    archive.append(markdown, { name: filePath });
  }

  await archive.finalize();
});

export default router;
