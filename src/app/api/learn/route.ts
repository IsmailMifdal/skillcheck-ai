import { withAuth, ok, ApiError } from "@/lib/api";
import { assertSessionOwner } from "@/lib/guards";
import { generateLesson } from "@/lib/services";

export const runtime = "nodejs";
export const maxDuration = 45;

/**
 * POST /api/learn
 * Génère à la demande une leçon ancrée sur le document (RAG) + exercice,
 * pour un concept en lacune.
 * body: { sessionId, conceptId }
 */
export const POST = withAuth(async ({ user, req }) => {
  const { sessionId, conceptId } = await req.json();
  if (!sessionId || !conceptId) throw new ApiError("Paramètres manquants.");

  await assertSessionOwner(sessionId, user.id);

  const lesson = await generateLesson(sessionId, conceptId);
  return ok({ lesson });
});
