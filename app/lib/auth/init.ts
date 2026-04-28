import { countByRole, createUser, findByEmail } from "./db";
import { hashPassword } from "./passwords";

let initPromise: Promise<void> | null = null;

async function runSeed(): Promise<void> {
  const existing = await countByRole("SUPER_ADMIN");
  if (existing > 0) return;

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "System Owner";

  if (!email || !password) {
    console.warn(
      "[auth/init] ADMIN_EMAIL or ADMIN_PASSWORD not set — SUPER_ADMIN will not be seeded. Add them to .env.local and restart.",
    );
    return;
  }

  const collision = await findByEmail(email);
  if (collision) {
    console.warn(`[auth/init] User with email ${email} already exists; skipping seed.`);
    return;
  }

  const password_hash = await hashPassword(password);
  await createUser({
    name,
    email,
    password_hash,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    must_change_password: false,
  });
  console.log(`[auth/init] Seeded SUPER_ADMIN ${email}`);
}

export function ensureSuperAdminSeeded(): Promise<void> {
  if (!initPromise) initPromise = runSeed();
  return initPromise;
}
