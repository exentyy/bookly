type SupabaseConfig = { url: string; publishableKey: string };

function readPublicConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return readPublicConfig() !== null;
}

export function getSupabaseConfig(): SupabaseConfig {
  const config = readPublicConfig();
  if (!config) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.");
  }

  if (config.publishableKey.startsWith("sb_secret_")) {
    throw new Error("A secret Supabase key cannot be used as a public client key.");
  }

  try {
    const payload = config.publishableKey.split(".")[1];
    if (payload) {
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string };
      if (decoded.role === "service_role") throw new Error("A service role key cannot be used by BOOKLY clients.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("cannot be used")) throw error;
    // Non-JWT publishable keys are valid and do not need decoding.
  }

  try {
    const parsedUrl = new URL(config.url);
    if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") {
      throw new Error("The Supabase project URL must use HTTPS.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("HTTPS")) throw error;
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL (localhost is allowed for local development).");
  }

  return config;
}
