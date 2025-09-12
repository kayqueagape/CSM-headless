import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Database
  DB_DRIVER: z.enum(["postgres", "mongodb", "in-memory"]).default("in-memory"),
  DATABASE_URL: z.string().optional(),
  MONGODB_URI: z.string().optional(),

  // Auth
  JWT_SECRET: z.string().min(32).default("change-this-super-secret-key-in-production-32chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // API
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  CORS_ORIGIN: z.string().default("*"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof EnvSchema>;
