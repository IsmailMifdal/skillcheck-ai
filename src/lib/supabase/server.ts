import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Client Supabase lié à la session utilisateur (via cookies).
 * Utilisé dans les Server Components / API routes pour connaître `auth.uid()`.
 */
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Appelé depuis un Server Component sans réponse mutable : ignorable,
          // le middleware rafraîchit déjà la session.
        }
      },
    },
  });
}

/**
 * Client admin (service_role) — contourne les RLS.
 * ⚠️ Serveur uniquement. Toutes les écritures LLM/RAG passent par ici,
 * après vérification manuelle que la ressource appartient à l'utilisateur.
 */
export function createAdminSupabase() {
  return createAdminClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Récupère l'utilisateur authentifié, ou null.
 * Les API routes s'en servent pour rejeter les requêtes non authentifiées.
 */
export async function getAuthUser() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
