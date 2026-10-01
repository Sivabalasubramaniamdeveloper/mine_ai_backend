import { createClient } from "@supabase/supabase-js";
import env from "./env.js";

const supabaseAuth = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabaseAuth;
