import "dotenv/config";

const env = {
  port: process.env.PORT || 3000,

  supabaseUrl: process.env.SUPABASE_URL,

  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

  apiKeyEncryptionSecret: process.env.API_KEY_ENCRYPTION_SECRET,

  mineAiGeminiApiKey: process.env.MINEAI_GEMINI_API_KEY,

  mineAiOpenAiApiKey: process.env.MINEAI_OPENAI_API_KEY,

  mineAiAnthropicApiKey: process.env.MINEAI_ANTHROPIC_API_KEY,
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

export default env;
