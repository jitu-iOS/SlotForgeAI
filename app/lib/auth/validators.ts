import type { Role, Status } from "@/app/types/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "USER"];
const STATUSES: Status[] = ["ACTIVE", "DISABLED"];

export function isString(v: unknown, max = 200): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}

export function isEmail(v: unknown): v is string {
  return typeof v === "string" && v.length <= 320 && EMAIL_RE.test(v);
}

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

export function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as string[]).includes(v);
}

export function badRequest(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}
