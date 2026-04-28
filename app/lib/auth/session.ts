import { cookies } from "next/headers";
import { findById } from "./db";
import { SESSION_COOKIE, verifySession, signSession, SESSION_MAX_AGE_SECONDS } from "./jwt";
import type { AuthUser, Role, User } from "@/app/types/auth";

export function toAuthUser(user: User): AuthUser {
  const { password_hash: _ph, ...rest } = user;
  return rest;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  const user = await findById(payload.sub);
  if (!user) return null;
  if (user.status !== "ACTIVE") return null;
  return toAuthUser(user);
}

export async function setSessionCookie(user: User): Promise<void> {
  const token = await signSession({ sub: user.id, email: user.email, role: user.role });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function hasRole(user: AuthUser | null, allowed: Role[]): boolean {
  return !!user && allowed.includes(user.role);
}
