"use client";

import { createBrowserClient } from "@supabase/ssr";

// Client Supabase côté navigateur. Utilise UNIQUEMENT la clé anon (publique).
// Sert à l'authentification (login/signup) et à la lecture protégée par RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
