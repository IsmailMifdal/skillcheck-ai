import { createAdminSupabase } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api";

// Vérifications d'appartenance : garantissent qu'un utilisateur n'accède
// qu'à SES sessions/documents, même si les routes utilisent la clé service_role.

/** Vérifie que la session appartient à l'utilisateur. Retourne la session. */
export async function assertSessionOwner(sessionId: string, userId: string) {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, user_id, document_id, phase, score_avant, score_apres")
    .eq("id", sessionId)
    .single();
  if (error || !data) throw new ApiError("Session introuvable.", 404);
  if (data.user_id !== userId) throw new ApiError("Accès refusé.", 403);
  return data;
}
