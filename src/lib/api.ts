import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

// Helpers partagés pour les API routes : auth + gestion d'erreurs cohérente.

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

/** Réponse JSON de succès. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Réponse JSON d'erreur. */
export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Enveloppe un handler d'API route : garantit l'authentification et
 * convertit toute exception en réponse JSON propre (jamais de 500 opaque).
 */
export function withAuth(
  handler: (ctx: {
    user: User;
    req: Request;
    params: Record<string, string>;
  }) => Promise<Response>
) {
  return async (req: Request, ctx: { params?: Record<string, string> }) => {
    try {
      const user = await getAuthUser();
      if (!user) return fail("Non authentifié.", 401);
      return await handler({ user, req, params: ctx.params ?? {} });
    } catch (err) {
      if (err instanceof ApiError) return fail(err.message, err.status);
      console.error("[API] Erreur non gérée :", err);
      const message =
        err instanceof Error ? err.message : "Erreur serveur inattendue.";
      return fail(message, 500);
    }
  };
}
