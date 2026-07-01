import { completeJSON } from "@/lib/openai";
import { createAdminSupabase } from "@/lib/supabase/server";
import { vectorizeDocument, retrieveContext } from "@/lib/rag";
import {
  conceptsPrompt,
  questionsPrompt,
  misconceptionPrompt,
  lessonPrompt,
} from "@/lib/prompts";
import { computeMastery, isMisconception, type AnswerSignal } from "@/lib/mastery";
import { ApiError } from "@/lib/api";
import type {
  ExtractedConceptsResult,
  GeneratedQuestionsResult,
  MisconceptionAnalysisResult,
  LessonResult,
  Confidence,
  AnswerPhase,
} from "@/types";

// ═══════════════════════════════════════════════════════════════════
// Couche service : orchestration LLM + RAG + persistance.
// Utilise le client admin (service_role). L'appartenance à l'utilisateur
// est TOUJOURS vérifiée en amont par les routes.
// ═══════════════════════════════════════════════════════════════════

const NB_QUESTIONS_PAR_DIFFICULTE = 1; // 3 concepts × 3 difficultés = pool adaptatif

/**
 * Pipeline complet d'ingestion d'un document :
 * 1. Insère le document, 2. le vectorise (RAG),
 * 3. extrait les concepts, 4. génère un pool de questions,
 * 5. crée une session de diagnostic.
 * @returns l'id de session prête pour le diagnostic.
 */
export async function ingestDocument(
  userId: string,
  titre: string,
  contenu: string
): Promise<{ sessionId: string; documentId: string }> {
  const supabase = createAdminSupabase();

  // 1. Document
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({ user_id: userId, titre, contenu })
    .select("id")
    .single();
  if (docErr || !doc) throw new ApiError("Échec de la création du document.");
  const documentId = doc.id as string;

  // 2. Vectorisation (chunks + embeddings)
  const globalEmbedding = await vectorizeDocument(documentId, contenu);
  await supabase
    .from("documents")
    .update({ embedding: globalEmbedding as unknown as string })
    .eq("id", documentId);

  // 3. Extraction des concepts (GPT-4o, JSON mode)
  const { system, user } = conceptsPrompt(contenu);
  const extracted = await completeJSON<ExtractedConceptsResult>({
    system,
    user,
    complexity: "complex",
  });
  if (!extracted.concepts?.length)
    throw new ApiError("Aucun concept n'a pu être extrait du document.");

  const conceptRows = extracted.concepts.map((c, i) => ({
    document_id: documentId,
    nom: c.nom,
    description: c.description,
    ordre: i,
  }));
  const { data: concepts, error: cErr } = await supabase
    .from("concepts")
    .insert(conceptRows)
    .select("id, nom, description, ordre");
  if (cErr || !concepts) throw new ApiError("Échec de l'insertion des concepts.");

  // 4. Génération d'un pool de questions par concept (difficultés 1,2,3)
  await generateQuestionPool(documentId, concepts);

  // 5. Session de diagnostic
  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .insert({ user_id: userId, document_id: documentId, phase: "diagnostic" })
    .select("id")
    .single();
  if (sErr || !session) throw new ApiError("Échec de la création de la session.");

  // Initialise la table de maîtrise (tous "non_teste")
  await supabase.from("maitrise").insert(
    concepts.map((c) => ({
      session_id: session.id,
      concept_id: c.id,
      score: 0,
      statut: "non_teste",
    }))
  );

  return { sessionId: session.id as string, documentId };
}

/** Génère, pour chaque concept, une question à chaque difficulté (1→3). */
async function generateQuestionPool(
  documentId: string,
  concepts: { id: string; nom: string; description: string | null }[]
) {
  const supabase = createAdminSupabase();

  // Pour chaque concept, on récupère le contexte RAG une fois, puis on génère
  // les 3 niveaux en parallèle. Tout est aplati en une seule insertion.
  const allQuestionRows: any[] = [];

  await Promise.all(
    concepts.map(async (concept) => {
      const contextChunks = await retrieveContext(
        documentId,
        `${concept.nom}. ${concept.description ?? ""}`,
        3
      );
      const contexte = contextChunks.map((c) => c.contenu).join("\n---\n");

      const difficulties: (1 | 2 | 3)[] = [1, 2, 3];
      const results = await Promise.all(
        difficulties.map((d) => {
          const p = questionsPrompt(
            concept.nom,
            concept.description ?? "",
            contexte,
            d,
            NB_QUESTIONS_PAR_DIFFICULTE
          );
          return completeJSON<GeneratedQuestionsResult>({
            system: p.system,
            user: p.user,
            complexity: "complex",
          });
        })
      );

      results.forEach((res, idx) => {
        const d = difficulties[idx];
        for (const q of res.questions ?? []) {
          // Validation défensive de la sortie LLM.
          if (
            !Array.isArray(q.options) ||
            q.options.length < 2 ||
            typeof q.reponse_correcte !== "number" ||
            q.reponse_correcte < 0 ||
            q.reponse_correcte >= q.options.length
          ) {
            continue; // on ignore une question malformée plutôt que de planter
          }
          allQuestionRows.push({
            concept_id: concept.id,
            enonce: q.enonce,
            options: q.options,
            reponse_correcte: q.reponse_correcte,
            explication: q.explication ?? null,
            difficulte: d,
          });
        }
      });
    })
  );

  if (allQuestionRows.length === 0)
    throw new ApiError("Aucune question valide n'a pu être générée.");

  const { error } = await supabase.from("questions").insert(allQuestionRows);
  if (error) throw new ApiError("Échec de l'insertion des questions.");
}

/**
 * Enregistre une réponse : grade côté serveur, détecte les faux acquis,
 * et recalcule la maîtrise du concept concerné.
 * @returns le résultat détaillé (pour l'UI + carte temps réel).
 */
export async function recordAnswer(params: {
  sessionId: string;
  questionId: string;
  reponseDonnee: number;
  confiance: Confidence;
  phase: AnswerPhase;
}) {
  const supabase = createAdminSupabase();
  const { sessionId, questionId, reponseDonnee, confiance, phase } = params;

  // Récupère la question (avec la bonne réponse — côté serveur uniquement).
  const { data: question, error: qErr } = await supabase
    .from("questions")
    .select("id, concept_id, enonce, options, reponse_correcte, explication, difficulte")
    .eq("id", questionId)
    .single();
  if (qErr || !question) throw new ApiError("Question introuvable.", 404);

  const est_correcte = reponseDonnee === question.reponse_correcte;
  const misconception = isMisconception(est_correcte, confiance);

  // Enregistre la réponse (upsert logique : on retire une éventuelle réponse
  // précédente à cette question dans cette phase pour éviter les doublons).
  await supabase
    .from("reponses")
    .delete()
    .eq("session_id", sessionId)
    .eq("question_id", questionId)
    .eq("phase", phase);

  const { error: insErr } = await supabase.from("reponses").insert({
    session_id: sessionId,
    question_id: questionId,
    reponse_donnee: reponseDonnee,
    est_correcte,
    confiance,
    misconception,
    phase,
  });
  if (insErr) throw new ApiError("Échec de l'enregistrement de la réponse.");

  // Recalcule la maîtrise du concept pour la phase courante uniquement
  // (le re-test mesure l'état POST-apprentissage, sans diluer avec le diagnostic).
  const mastery = await recomputeConceptMastery(
    sessionId,
    question.concept_id as string,
    phase
  );

  // Analyse de la nature de l'erreur si faux (misconception ou simple erreur).
  let misconceptionAnalysis: MisconceptionAnalysisResult | null = null;
  if (!est_correcte) {
    try {
      const p = misconceptionPrompt(
        question.enonce as string,
        question.options as string[],
        reponseDonnee,
        question.reponse_correcte as number
      );
      misconceptionAnalysis = await completeJSON<MisconceptionAnalysisResult>({
        system: p.system,
        user: p.user,
        complexity: "simple", // tâche courte → 4o-mini (coût/vitesse)
      });
    } catch {
      misconceptionAnalysis = null; // non bloquant
    }
  }

  return {
    est_correcte,
    misconception,
    correctIndex: question.reponse_correcte as number,
    explication: question.explication as string | null,
    conceptId: question.concept_id as string,
    mastery, // { score, statut } → mise à jour de la carte
    misconceptionAnalysis,
  };
}

/** Recalcule le statut de maîtrise d'un concept (pour une phase) et le persiste. */
export async function recomputeConceptMastery(
  sessionId: string,
  conceptId: string,
  phase: AnswerPhase
) {
  const supabase = createAdminSupabase();

  // Réponses de la phase courante portant sur des questions de ce concept.
  const { data: rows } = await supabase
    .from("reponses")
    .select("est_correcte, confiance, questions!inner(concept_id, difficulte)")
    .eq("session_id", sessionId)
    .eq("phase", phase)
    .eq("questions.concept_id", conceptId);

  const signals: AnswerSignal[] = (rows ?? []).map((r: any) => ({
    est_correcte: r.est_correcte,
    confiance: r.confiance,
    difficulte: r.questions.difficulte,
  }));

  const { score, statut } = computeMastery(signals);

  await supabase
    .from("maitrise")
    .update({ score, statut, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("concept_id", conceptId);

  return { score, statut };
}

/**
 * Calcule le score global d'une phase (0-100) = moyenne des scores de maîtrise
 * des concepts testés, et le stocke dans la session.
 */
export async function computeSessionScore(
  sessionId: string,
  phase: AnswerPhase
): Promise<number> {
  const supabase = createAdminSupabase();
  const { data: mastery } = await supabase
    .from("maitrise")
    .select("score, statut")
    .eq("session_id", sessionId);

  const tested = (mastery ?? []).filter((m) => m.statut !== "non_teste");
  const score =
    tested.length === 0
      ? 0
      : Math.round(
          tested.reduce((s, m) => s + Number(m.score), 0) / tested.length
        );

  const column = phase === "diagnostic" ? "score_avant" : "score_apres";
  await supabase
    .from("sessions")
    .update({ [column]: score })
    .eq("id", sessionId);

  return score;
}

/**
 * Génère une leçon ciblée ancrée sur le document (RAG) pour un concept,
 * en tenant compte d'une éventuelle misconception détectée.
 */
export async function generateLesson(
  sessionId: string,
  conceptId: string
): Promise<LessonResult> {
  const supabase = createAdminSupabase();

  const { data: concept, error } = await supabase
    .from("concepts")
    .select("id, nom, description, document_id")
    .eq("id", conceptId)
    .single();
  if (error || !concept) throw new ApiError("Concept introuvable.", 404);

  const { data: mastery } = await supabase
    .from("maitrise")
    .select("statut")
    .eq("session_id", sessionId)
    .eq("concept_id", conceptId)
    .single();

  // Contexte RAG pour ancrer l'explication et fournir une citation vérifiable.
  const chunks = await retrieveContext(
    concept.document_id as string,
    `${concept.nom}. ${concept.description ?? ""}`,
    4
  );
  const contexte = chunks.map((c) => c.contenu).join("\n---\n");

  // Si faux acquis : on récupère la nature de l'erreur la plus récente.
  let misconceptionNote: string | undefined;
  if (mastery?.statut === "misconception") {
    misconceptionNote = `L'apprenant a répondu faux avec confiance sur "${concept.nom}".`;
  }

  const p = lessonPrompt(
    concept.nom as string,
    (mastery?.statut as string) ?? "fragile",
    contexte,
    misconceptionNote
  );
  return completeJSON<LessonResult>({
    system: p.system,
    user: p.user,
    complexity: "complex",
  });
}
