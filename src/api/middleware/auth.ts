import { randomBytes } from "node:crypto";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || randomBytes(64).toString("hex");

export interface AuthPayload {
  userId: number;
  username: string;
  email: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const payload = verifyToken(authHeader.slice(7));
    if (payload) {
      (req as any).userId = payload.userId;
      (req as any).username = payload.username;
      return next();
    }
  }

  const guestId = req.headers["x-guest-session"] as string;
  if (guestId) {
    (req as any).guestSessionId = guestId;
  }

  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    return;
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ success: false, error: "الجلسة منتهية" });
    return;
  }

  (req as any).userId = payload.userId;
  (req as any).username = payload.username;
  next();
}
