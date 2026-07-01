import { withAuth, ok } from "@/lib/api";
import { assertSessionOwner } from "@/lib/guards";
import { getSessionPayload } from "@/lib/sqlite";
import type { ClientQuestion } from "@/types";

export const runtime = "nodejs";

/**
 * GET /api/sessions/[id]
 * Renvoie tout l'état nécessaire aux écrans diagnostic / apprendre / résultats :
 * session, document, concepts + maîtrise, et questions SANS la bonne réponse.
 */
export const GET = withAuth(async ({ user, params }) => {
  const sessionId = params.id;
  const session = await assertSessionOwner(sessionId, user.id);
  const payload = getSessionPayload(sessionId);
  const document = payload?.document ?? null;
  const concepts = payload?.concepts ?? [];
  const mastery = payload?.mastery ?? [];

  const questions: ClientQuestion[] = (payload?.questions ?? []).map((q: any) => ({
    id: q.id,
    concept_id: q.concept_id,
    enonce: q.enonce,
    options: q.options,
    difficulte: q.difficulte,
  }));

  const masteryByConcept = Object.fromEntries(
    mastery.map((m) => [m.concept_id, m])
  );

  const conceptsWithMastery = concepts.map((c) => ({
    ...c,
    score: masteryByConcept[c.id]?.score ?? 0,
    statut: masteryByConcept[c.id]?.statut ?? "non_teste",
  }));

  return ok({
    session,
    document,
    concepts: conceptsWithMastery,
    questions,
    reponses: payload?.reponses ?? [],
  });
});
