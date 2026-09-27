const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
} as const;

const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  encryptionKey: process.env.ENCRYPTION_KEY,
  jwtSecret: process.env.JWT_SECRET,
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  githubAppId: process.env.GITHUB_APP_ID,
  githubPrivateKey: process.env.GITHUB_PRIVATE_KEY,
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  vercelToken: process.env.VERCEL_TOKEN,
  vercelTeamId: process.env.VERCEL_TEAM_ID,
  cashfreeClientId: process.env.CASHFREE_CLIENT_ID,
  cashfreeClientSecret: process.env.CASHFREE_CLIENT_SECRET,
  cashfreeEnvironment: process.env.CASHFREE_ENVIRONMENT ?? process.env.CASHFREE_ENV,
  cashfreeWebhookSecret: process.env.CASHFREE_WEBHOOK_SECRET,
  shiprocketEmail: process.env.SHIPROCKET_EMAIL,
  shiprocketPassword: process.env.SHIPROCKET_PASSWORD,
  shiprocketApiKey: process.env.SHIPROCKET_API_KEY,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  smtpFrom: process.env.SMTP_FROM,
} as const;

export function getPublicEnv() {
  return publicEnv;
}

export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("Server environment configuration cannot be accessed from client code.");
  }
  return serverEnv;
}

export function requireServerEnv<K extends keyof typeof serverEnv>(key: K): string {
  const value = serverEnv[key];
  if (!value) throw new Error(`CONFIGURATION_REQUIRED: ${String(key)}`);
  return value;
}

export function isConfigured(value: string | undefined | null): boolean {
  return Boolean(value && value.trim());
}
