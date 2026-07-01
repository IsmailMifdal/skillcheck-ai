import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/sqlite";

// Vérifications d'appartenance : garantissent qu'un utilisateur n'accède
// qu'à SES sessions/documents, même si les routes utilisent la clé service_role.

/** Vérifie que la session appartient à l'utilisateur. Retourne la session. */
export async function assertSessionOwner(sessionId: string, userId: string) {
  const data = getSession(sessionId);
  if (!data) throw new ApiError("Session introuvable.", 404);
  if (data.user_id !== userId) throw new ApiError("Accès refusé.", 403);
  return data;
}
