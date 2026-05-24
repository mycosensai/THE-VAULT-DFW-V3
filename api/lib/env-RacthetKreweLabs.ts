/**
 * Cloudflare Workers Environment
 * No dotenv, no process.env — bindings come from wrangler.toml / dashboard
 */

interface CloudflareEnv {
  APP_SECRET: string;
  APP_ID?: string;
  DATABASE_URL?: string;
  OWNER_UNION_ID?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  VITE_STRIPE_PUBLISHABLE_KEY?: string;
  COINBASE_API_KEY?: string;
  COINBASE_WEBHOOK_SECRET?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  X_CLIENT_ID?: string;
  X_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  NODE_ENV?: string;
  VAULT_DOMAIN?: string;
  RESEND_API_KEY?: string;
  DB?: any;
}

let cfEnv: CloudflareEnv = {
  APP_SECRET: "development-secret-change-in-production",
};

export function setCloudflareEnv(env: Record<string, unknown>) {
  cfEnv = { ...cfEnv, ...(env as any) };
}

export const env = {
  get appId(): string { return cfEnv.APP_ID || ""; },
  get appSecret(): string { return cfEnv.APP_SECRET || "fallback-secret"; },
  get isProduction(): boolean { return cfEnv.NODE_ENV === "production"; },
  get databaseUrl(): string { return cfEnv.DATABASE_URL || ""; },
  get ownerUnionId(): string { return cfEnv.OWNER_UNION_ID || ""; },
  get stripeSecretKey(): string { return cfEnv.STRIPE_SECRET_KEY || ""; },
  get stripeWebhookSecret(): string { return cfEnv.STRIPE_WEBHOOK_SECRET || ""; },
  get stripePublishableKey(): string { return cfEnv.VITE_STRIPE_PUBLISHABLE_KEY || ""; },
  get coinbaseApiKey(): string { return cfEnv.COINBASE_API_KEY || ""; },
  get coinbaseWebhookSecret(): string { return cfEnv.COINBASE_WEBHOOK_SECRET || ""; },
  get openaiApiKey(): string { return cfEnv.OPENAI_API_KEY || ""; },
  get googleClientId(): string { return cfEnv.GOOGLE_CLIENT_ID || ""; },
  get googleClientSecret(): string { return cfEnv.GOOGLE_CLIENT_SECRET || ""; },
  get xClientId(): string { return cfEnv.X_CLIENT_ID || ""; },
  get xClientSecret(): string { return cfEnv.X_CLIENT_SECRET || ""; },
  get githubClientId(): string { return cfEnv.GITHUB_CLIENT_ID || ""; },
  get githubClientSecret(): string { return cfEnv.GITHUB_CLIENT_SECRET || ""; },
  get vaultDomain(): string { return cfEnv.VAULT_DOMAIN || ""; },
  get resendApiKey(): string { return cfEnv.RESEND_API_KEY || ""; },
};
