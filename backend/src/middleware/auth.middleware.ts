import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "nexo-secret-change-me";

export interface AuthPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth  = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) return res.status(401).json({ message: "Token ausente" });

  try {
    const { userId } = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return res.status(401).json({ message: "Usuário não encontrado" });
    req.userId = userId;
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
}

// Verifica se o usuário é membro do workspace (e retorna o papel)
export async function requireWorkspaceMember(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { workspaceId } = req.params;
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.userId } },
  });
  if (!member) return res.status(403).json({ message: "Sem acesso a este workspace" });
  next();
}
