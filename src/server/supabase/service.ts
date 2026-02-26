/**
 * BACKEND: Service role Supabase client — bypasses RLS.
 * Use ONLY in API routes and server-side integrations (Vapi webhook, Stripe webhook, etc.)
 * NEVER expose to the browser.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
