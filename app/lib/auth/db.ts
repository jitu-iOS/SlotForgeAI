import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { User, Role, Status } from "@/app/types/auth";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "users.json");

let cache: User[] | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function loadAll(): Promise<User[]> {
  if (cache) return cache;
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  cache = raw.trim() ? (JSON.parse(raw) as User[]) : [];
  return cache;
}

async function persist(users: User[]): Promise<void> {
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(users, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
  cache = users;
}

function enqueueWrite(mutate: (users: User[]) => User[] | Promise<User[]>): Promise<void> {
  const next = writeQueue.then(async () => {
    const users = await loadAll();
    const updated = await mutate([...users]);
    await persist(updated);
  });
  writeQueue = next.catch(() => undefined);
  return next;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function listUsers(): Promise<User[]> {
  const users = await loadAll();
  return [...users].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function findById(id: string): Promise<User | null> {
  const users = await loadAll();
  return users.find((u) => u.id === id) ?? null;
}

export async function findByEmail(email: string): Promise<User | null> {
  const users = await loadAll();
  const e = normalizeEmail(email);
  return users.find((u) => u.email === e) ?? null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  status?: Status;
  must_change_password?: boolean;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const now = new Date().toISOString();
  const user: User = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    password_hash: input.password_hash,
    role: input.role,
    status: input.status ?? "ACTIVE",
    must_change_password: input.must_change_password ?? false,
    created_at: now,
    updated_at: now,
  };

  await enqueueWrite((users) => {
    if (users.some((u) => u.email === user.email)) {
      throw new Error("EMAIL_TAKEN");
    }
    users.push(user);
    return users;
  });

  return user;
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, "name" | "role" | "status" | "password_hash" | "must_change_password">>,
): Promise<User> {
  let updated: User | null = null;
  await enqueueWrite((users) => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error("USER_NOT_FOUND");
    users[idx] = { ...users[idx], ...patch, updated_at: new Date().toISOString() };
    updated = users[idx];
    return users;
  });
  return updated!;
}

export async function countByRole(role: Role): Promise<number> {
  const users = await loadAll();
  return users.filter((u) => u.role === role).length;
}

export function clearCache(): void {
  cache = null;
}
