import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client. Returns null if env is not configured —
 * this lets the game run offline in dev with the default DNA.
 */
export const supabase =
  url && anonKey ? createClient(url, anonKey) : null;

export const hasSupabase = supabase !== null;
