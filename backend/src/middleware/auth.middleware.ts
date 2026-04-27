import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

const GATE_URL = process.env.GATE_URL ?? "http://localhost:3100";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      isAdmin?: boolean;
    }
  }
}

interface GateUserInfo {
  sub: string;
  username: string;
  email?: string;
  roles?: string[];
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) return res.status(401).json({ message: "Token ausente" });

  try {
    const resp = await fetch(`${GATE_URL}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) {
      return res.status(401).json({ message: "Token inválido ou expirado" });
    }

    const info = (await resp.json()) as GateUserInfo;

    let user = await prisma.user.findUnique({ where: { gateId: info.sub } });

    if (!user) {
      const byUsername = await prisma.user.findUnique({ where: { username: info.username } });
      if (byUsername) {
        user = await prisma.user.update({
          where: { id: byUsername.id },
          data: { gateId: info.sub },
        });
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          gateId: info.sub,
          username: info.username,
          email: info.email ?? `${info.username}@gate.internal`,
          name: info.username,
        },
      });
    }

    req.userId = user.id;
    req.isAdmin = (info.roles ?? []).includes("admin");
    next();
  } catch (err) {
    console.error("Gate auth error:", err);
    return res.status(500).json({ message: "Erro ao validar token" });
  }
}

// Verifica se o usuário é membro do workspace (admin do Gate sempre passa)
export async function requireWorkspaceMember(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.isAdmin) return next();
  const { workspaceId } = req.params;
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.userId } },
  });
  if (!member) return res.status(403).json({ message: "Sem acesso a este workspace" });
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAdmin) return res.status(403).json({ message: "Forbidden" });
  next();
}

// Helper for verifying token in inline routes (replaces old verifyToken)
export async function verifyGateToken(token: string): Promise<{ userId: string } | null> {
  try {
    const resp = await fetch(`${GATE_URL}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const info = (await resp.json()) as GateUserInfo;
    const user = await prisma.user.findUnique({ where: { gateId: info.sub } });
    return user ? { userId: user.id } : null;
  } catch {
    return null;
  }
}
