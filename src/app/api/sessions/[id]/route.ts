import { withAuth, ok } from "@/lib/api";
import { assertSessionOwner } from "@/lib/guards";
import { createAdminSupabase } from "@/lib/supabase/server";
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
  const supabase = createAdminSupabase();

  const [{ data: document }, { data: concepts }, { data: mastery }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id, titre")
        .eq("id", session.document_id)
        .single(),
      supabase
        .from("concepts")
        .select("id, document_id, nom, description, ordre")
        .eq("document_id", session.document_id)
        .order("ordre"),
      supabase
        .from("maitrise")
        .select("concept_id, score, statut")
        .eq("session_id", sessionId),
    ]);

  const conceptIds = (concepts ?? []).map((c) => c.id);

  // Questions SANS reponse_correcte ni explication (anti-triche côté client).
  const { data: rawQuestions } = await supabase
    .from("questions")
    .select("id, concept_id, enonce, options, difficulte")
    .in("concept_id", conceptIds.length ? conceptIds : ["00000000-0000-0000-0000-000000000000"]);

  const questions: ClientQuestion[] = (rawQuestions ?? []).map((q: any) => ({
    id: q.id,
    concept_id: q.concept_id,
    enonce: q.enonce,
    options: q.options,
    difficulte: q.difficulte,
  }));

  // Réponses déjà données (pour reprise / calcul de progression).
  const { data: reponses } = await supabase
    .from("reponses")
    .select("question_id, est_correcte, confiance, misconception, phase")
    .eq("session_id", sessionId);

  const masteryByConcept = Object.fromEntries(
    (mastery ?? []).map((m) => [m.concept_id, m])
  );

  const conceptsWithMastery = (concepts ?? []).map((c) => ({
    ...c,
    score: masteryByConcept[c.id]?.score ?? 0,
    statut: masteryByConcept[c.id]?.statut ?? "non_teste",
  }));

  return ok({
    session,
    document,
    concepts: conceptsWithMastery,
    questions,
    reponses: reponses ?? [],
  });
});
