import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

const formatIssue = (issue: z.ZodIssue) => {
  const path = issue.path.length > 0 ? issue.path.join(".") : "environment";

  return `${path}: ${issue.message}`;
};

export const getEnv = (): AppEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration. ${parsed.error.issues.map(formatIssue).join("; ")}`,
    );
  }

  cachedEnv = parsed.data;

  return cachedEnv;
};
