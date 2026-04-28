import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload, Role } from "@/app/types/auth";

const COOKIE_NAME = "sf_session";
const SESSION_HOURS = 12;

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error(
      "JWT_SECRET environment variable is missing or too short. Set it to a long random string in .env.local.",
    );
  }
  return new TextEncoder().encode(raw);
}

export async function signSession(payload: { sub: string; email: string; role: Role }): Promise<string> {
  return new SignJWT({ sub: payload.sub, email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = SESSION_HOURS * 60 * 60;
