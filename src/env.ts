import { z } from "zod";

const EnvSchema = z.object({
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  STRIPE_SECRET_KEY: z.string().optional(),
  VITE_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  VAULT_DOMAIN: z.string().optional(),
  DB: z.any().optional(),
}).refine((data) => {
  if (data.NODE_ENV === "production") {
    return !!data.APP_SECRET && data.APP_SECRET.length >= 32;
  }
  return true;
}, { message: "Production requires strong APP_SECRET" });

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(env: Record<string, unknown>): Env {
  return EnvSchema.parse(env);
}