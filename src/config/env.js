import "dotenv/config";

const env = {
  port: process.env.PORT || 3000,

  supabaseUrl: process.env.SUPABASE_URL,

  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

  supabaseBucket :process.env.SUPABASE_OTT_BUCKET,

  apiKeyEncryptionSecret: process.env.API_KEY_ENCRYPTION_SECRET,

  mineAiGeminiApiKey: process.env.MINEAI_GEMINI_API_KEY,

  mineAiOpenAiApiKey: process.env.MINEAI_OPENAI_API_KEY,

  mineAiAnthropicApiKey: process.env.MINEAI_ANTHROPIC_API_KEY,

  mailHost: (process.env.MAIL_HOST || "smtp.gmail.com").trim(),
  mailPort: Number(process.env.MAIL_PORT || 465),
  mailUser: (process.env.MAIL_USER || "mineai.support@gmail.com").trim(),
  mailPassword: process.env.MAIL_PASSWORD ? process.env.MAIL_PASSWORD.trim() : undefined,
  mailFrom: process.env.MAIL_FROM || "MineAI <mineai.support@gmail.com>",
  supportEmail: process.env.SUPPORT_EMAIL || "mineai.support@gmail.com",
};

if (!env.supabaseUrl) {
  throw new Error("SUPABASE_URL is missing");
}

if (!env.supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
}

if (!env.supabaseAnonKey) {
  throw new Error("SUPABASE_ANON_KEY is missing");
}

if (!env.apiKeyEncryptionSecret) {
  throw new Error("API_KEY_ENCRYPTION_SECRET is missing");
}

if (!env.supabaseBucket) {
  throw new Error("supabaseBucket is missing");
}

export default env;
