import { readKey, type ProviderName } from "./vault";

const ENV_VAR: Record<ProviderName, string> = {
  openai: "OPENAI_API_KEY",
  replicate: "REPLICATE_API_TOKEN",
  runway: "RUNWAY_API_KEY",
  imagineart: "IMAGINEART_API_KEY",
};

export type KeySource = "panel" | "env" | "none";

export async function getProviderKey(provider: ProviderName): Promise<string | null> {
  const fromVault = await readKey(provider);
  if (fromVault) return fromVault;
  const envValue = process.env[ENV_VAR[provider]];
  return envValue && envValue.trim().length > 0 ? envValue : null;
}

export async function getKeySource(provider: ProviderName): Promise<KeySource> {
  const fromVault = await readKey(provider);
  if (fromVault) return "panel";
  const envValue = process.env[ENV_VAR[provider]];
  if (envValue && envValue.trim().length > 0) return "env";
  return "none";
}

export function envVarFor(provider: ProviderName): string {
  return ENV_VAR[provider];
}
