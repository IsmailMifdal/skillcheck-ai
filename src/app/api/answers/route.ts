import { withAuth, ok, ApiError } from "@/lib/api";
import { assertSessionOwner } from "@/lib/guards";
import { recordAnswer } from "@/lib/services";
import type { Confidence, AnswerPhase } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/answers
 * Enregistre et grade une réponse ; renvoie le verdict, la maîtrise mise à jour
 * (pour la carte temps réel) et l'analyse de l'erreur le cas échéant.
 */
export const POST = withAuth(async ({ user, req }) => {
  const body = await req.json();
  const {
    sessionId,
    questionId,
    reponseDonnee,
    confiance,
    phase,
  }: {
    sessionId: string;
    questionId: string;
    reponseDonnee: number;
    confiance: Confidence;
    phase: AnswerPhase;
  } = body;

  if (!sessionId || !questionId || typeof reponseDonnee !== "number") {
    throw new ApiError("Paramètres manquants ou invalides.");
  }
  if (confiance !== "sur" && confiance !== "hesitant") {
    throw new ApiError("Confiance invalide.");
  }

  await assertSessionOwner(sessionId, user.id);

  const result = await recordAnswer({
    sessionId,
    questionId,
    reponseDonnee,
    confiance,
    phase: phase === "retest" ? "retest" : "diagnostic",
  });

  return ok(result);
});
