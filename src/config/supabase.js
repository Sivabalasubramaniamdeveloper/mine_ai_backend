import { createClient } from "@supabase/supabase-js";
import env from "./env.js";

const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

export default supabase;
