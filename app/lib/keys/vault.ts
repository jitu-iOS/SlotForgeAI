import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type ProviderName = "openai" | "replicate" | "runway" | "imagineart";

interface VaultEntry {
  ciphertext: string;
  iv: string;
  tag: string;
  lastFour: string;
  updatedAt: string;
  updatedBy: string;
}

interface VaultFile {
  version: 1;
  entries: Partial<Record<ProviderName, VaultEntry>>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const VAULT_FILE = path.join(DATA_DIR, "api-keys.enc.json");

let cache: VaultFile | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export class VaultDisabledError extends Error {
  constructor() {
    super("KEY_VAULT_SECRET is not set. Refusing to read or write encrypted keys.");
    this.name = "VaultDisabledError";
  }
}

export function isVaultEnabled(): boolean {
  const raw = process.env.KEY_VAULT_SECRET;
  return typeof raw === "string" && raw.length >= 16;
}

function getKey(): Buffer {
  const raw = process.env.KEY_VAULT_SECRET;
  if (!raw || raw.length < 16) throw new VaultDisabledError();
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(VAULT_FILE);
  } catch {
    const empty: VaultFile = { version: 1, entries: {} };
    await fs.writeFile(VAULT_FILE, JSON.stringify(empty, null, 2), "utf8");
  }
}

async function loadAll(): Promise<VaultFile> {
  if (cache) return cache;
  await ensureFile();
  const raw = await fs.readFile(VAULT_FILE, "utf8");
  const parsed = raw.trim() ? (JSON.parse(raw) as VaultFile) : { version: 1, entries: {} };
  cache = parsed;
  return cache;
}

async function persist(file: VaultFile): Promise<void> {
  const tmp = `${VAULT_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(file, null, 2), "utf8");
  await fs.rename(tmp, VAULT_FILE);
  cache = file;
}

function enqueueWrite(mutate: (file: VaultFile) => VaultFile | Promise<VaultFile>): Promise<void> {
  const next = writeQueue.then(async () => {
    const f = await loadAll();
    const updated = await mutate({ version: f.version, entries: { ...f.entries } });
    await persist(updated);
  });
  writeQueue = next.catch(() => undefined);
  return next;
}

function encrypt(plaintext: string): { ciphertext: string; iv: string; tag: string } {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: enc.toString("base64"), iv: iv.toString("base64"), tag: tag.toString("base64") };
}

function decrypt(entry: VaultEntry): string {
  const key = getKey();
  const iv = Buffer.from(entry.iv, "base64");
  const tag = Buffer.from(entry.tag, "base64");
  const ciphertext = Buffer.from(entry.ciphertext, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return dec.toString("utf8");
}

export interface PublicVaultEntry {
  provider: ProviderName;
  lastFour: string;
  updatedAt: string;
  updatedBy: string;
}

export async function listEntries(): Promise<PublicVaultEntry[]> {
  if (!isVaultEnabled()) return [];
  const f = await loadAll();
  return (Object.keys(f.entries) as ProviderName[])
    .filter((p) => f.entries[p])
    .map((p) => ({
      provider: p,
      lastFour: f.entries[p]!.lastFour,
      updatedAt: f.entries[p]!.updatedAt,
      updatedBy: f.entries[p]!.updatedBy,
    }));
}

export async function getEntry(provider: ProviderName): Promise<PublicVaultEntry | null> {
  if (!isVaultEnabled()) return null;
  const f = await loadAll();
  const e = f.entries[provider];
  if (!e) return null;
  return { provider, lastFour: e.lastFour, updatedAt: e.updatedAt, updatedBy: e.updatedBy };
}

export async function setKey(provider: ProviderName, key: string, updatedBy: string): Promise<PublicVaultEntry> {
  if (!isVaultEnabled()) throw new VaultDisabledError();
  if (typeof key !== "string" || key.length < 8) throw new Error("Key looks invalid (too short)");
  const trimmed = key.trim();
  const enc = encrypt(trimmed);
  const lastFour = trimmed.slice(-4);
  const entry: VaultEntry = { ...enc, lastFour, updatedAt: new Date().toISOString(), updatedBy };
  await enqueueWrite((file) => {
    file.entries[provider] = entry;
    return file;
  });
  return { provider, lastFour, updatedAt: entry.updatedAt, updatedBy };
}

export async function removeKey(provider: ProviderName): Promise<void> {
  if (!isVaultEnabled()) throw new VaultDisabledError();
  await enqueueWrite((file) => {
    delete file.entries[provider];
    return file;
  });
}

export async function readKey(provider: ProviderName): Promise<string | null> {
  if (!isVaultEnabled()) return null;
  const f = await loadAll();
  const e = f.entries[provider];
  if (!e) return null;
  try {
    return decrypt(e);
  } catch (err) {
    console.error(`[vault] decrypt failed for ${provider}:`, err);
    return null;
  }
}
