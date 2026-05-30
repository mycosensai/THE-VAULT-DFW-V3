/**
 * Cloudflare Workers Environment
 * No dotenv, no process.env — bindings come from wrangler.toml / dashboard
 */

interface CloudflareEnv {
  APP_SECRET: string;
  APP_ID?: string;
  DATABASE_URL?: string;
  KIMI_AUTH_URL?: string;
  KIMI_OPEN_URL?: string;
  OWNER_UNION_ID?: string;
  STRIPE_SECRET_KEY?: string;
  VITE_STRIPE_PUBLISHABLE_KEY?: string;
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
  // Web3 Treasury
  SOLANA_TREASURY?: string;
  SOLANA_RPC_URL?: string;
  SOL_USD_RATE?: string;
  USDC_USD_RATE?: string;
  TREASURY_WALLET?: string;
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
  get kimiAuthUrl(): string { return cfEnv.KIMI_AUTH_URL || ""; },
  get kimiOpenUrl(): string { return cfEnv.KIMI_OPEN_URL || ""; },
  get ownerUnionId(): string { return cfEnv.OWNER_UNION_ID || ""; },
  get stripeSecretKey(): string { return cfEnv.STRIPE_SECRET_KEY || ""; },
  get stripePublishableKey(): string { return cfEnv.VITE_STRIPE_PUBLISHABLE_KEY || ""; },
  get openaiApiKey(): string { return cfEnv.OPENAI_API_KEY || ""; },
  get googleClientId(): string { return cfEnv.GOOGLE_CLIENT_ID || ""; },
  get googleClientSecret(): string { return cfEnv.GOOGLE_CLIENT_SECRET || ""; },
  get xClientId(): string { return cfEnv.X_CLIENT_ID || ""; },
  get xClientSecret(): string { return cfEnv.X_CLIENT_SECRET || ""; },
  get githubClientId(): string { return cfEnv.GITHUB_CLIENT_ID || ""; },
  get githubClientSecret(): string { return cfEnv.GITHUB_CLIENT_SECRET || ""; },
  get vaultDomain(): string { return cfEnv.VAULT_DOMAIN || ""; },
  get resendApiKey(): string { return cfEnv.RESEND_API_KEY || ""; },
  // Web3 Treasury
  get solanaTreasury(): string { return cfEnv.SOLANA_TREASURY || ""; },
  get solanaRpcUrl(): string { return cfEnv.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"; },
  get solUsdRate(): string { return cfEnv.SOL_USD_RATE || ""; },
  get usdcUsdRate(): string { return cfEnv.USDC_USD_RATE || "1.00"; },
  get treasuryWallet(): string { return cfEnv.TREASURY_WALLET || ""; },
};