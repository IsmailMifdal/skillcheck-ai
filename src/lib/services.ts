import { completeJSON } from "@/lib/openai";
import { vectorizeDocument, retrieveContext } from "@/lib/rag";
import {
  createDocument,
  createSession,
  deleteDocument,
  getAnswerSignals,
  getConcept,
  getMasteryRows,
  getMasteryStatus,
  getQuestion,
  insertConcepts,
  insertMasteryRows,
  insertQuestions,
  replaceResponse,
  updateDocumentEmbedding,
  updateMastery,
  updateSessionScore,
} from "@/lib/sqlite";
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

const NB_QUESTIONS_PAR_DIFFICULTE = 1; // pool adaptatif léger pour éviter les timeouts
const MAX_CONCEPT_EXTRACTION_CHARS = 24000;

function compactForConceptExtraction(text: string) {
  if (text.length <= MAX_CONCEPT_EXTRACTION_CHARS) return text;

  const half = Math.floor(MAX_CONCEPT_EXTRACTION_CHARS / 2);
  return [
    text.slice(0, half),
    "\n\n[... document raccourci pour l'analyse initiale ...]\n\n",
    text.slice(-half),
  ].join("");
}

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
  let documentId: string | null = null;

  try {
    // 1. Document
    documentId = createDocument(userId, titre, contenu);
    const savedDocumentId = documentId;

    // 2. Vectorisation (chunks + embeddings)
    const globalEmbedding = await vectorizeDocument(savedDocumentId, contenu);
    updateDocumentEmbedding(savedDocumentId, globalEmbedding);

    // 3. Extraction des concepts (GPT-4o, JSON mode)
    const { system, user } = conceptsPrompt(compactForConceptExtraction(contenu));
    const extracted = await completeJSON<ExtractedConceptsResult>({
      system,
      user,
      complexity: "complex",
    });
    if (!extracted.concepts?.length)
      throw new ApiError("Aucun concept n'a pu être extrait du document.");

    const conceptRows = extracted.concepts.slice(0, 5).map((c, i) => ({
      document_id: savedDocumentId,
      nom: c.nom,
      description: c.description,
      ordre: i,
    }));
    const concepts = insertConcepts(conceptRows);

    // 4. Génération d'un pool de questions par concept.
    await generateQuestionPool(savedDocumentId, concepts);

    // 5. Session de diagnostic
    const sessionId = createSession(userId, savedDocumentId);

    // Initialise la table de maîtrise (tous "non_teste")
    insertMasteryRows(
      concepts.map((c) => ({
        session_id: sessionId,
        concept_id: c.id,
        score: 0,
        statut: "non_teste" as const,
      }))
    );

    return { sessionId, documentId: savedDocumentId };
  } catch (err) {
    if (documentId) {
      deleteDocument(documentId);
    }
    console.error("[ingestDocument] Échec :", err);
    throw err;
  }
}

/** Génère, pour chaque concept, une question à chaque difficulté (1→3). */
async function generateQuestionPool(
  documentId: string,
  concepts: { id: string; nom: string; description: string | null }[]
) {
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

      const difficulties: (1 | 2 | 3)[] = [1, 2];
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

  insertQuestions(allQuestionRows);
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
  const { sessionId, questionId, reponseDonnee, confiance, phase } = params;

  // Récupère la question (avec la bonne réponse — côté serveur uniquement).
  const question = getQuestion(questionId) as
    | {
        id: string;
        concept_id: string;
        enonce: string;
        options: string[];
        reponse_correcte: number;
        explication: string | null;
        difficulte: number;
      }
    | null;
  if (!question) throw new ApiError("Question introuvable.", 404);

  const est_correcte = reponseDonnee === question.reponse_correcte;
  const misconception = isMisconception(est_correcte, confiance);

  // Enregistre la réponse (upsert logique : on retire une éventuelle réponse
  // précédente à cette question dans cette phase pour éviter les doublons).
  replaceResponse({
    sessionId,
    questionId,
    reponseDonnee,
    estCorrecte: est_correcte,
    confiance,
    misconception,
    phase,
  });

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
        question.options,
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
  const signals: AnswerSignal[] = getAnswerSignals(sessionId, conceptId, phase).map((r: any) => ({
    est_correcte: r.est_correcte,
    confiance: r.confiance,
    difficulte: r.difficulte,
  }));

  const { score, statut } = computeMastery(signals);

  updateMastery(sessionId, conceptId, score, statut);

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
  const mastery = getMasteryRows(sessionId);

  const tested = mastery.filter((m) => m.statut !== "non_teste");
  const score =
    tested.length === 0
      ? 0
      : Math.round(
          tested.reduce((s, m) => s + Number(m.score), 0) / tested.length
        );

  updateSessionScore(sessionId, phase, score);

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
  const concept = getConcept(conceptId);
  if (!concept) throw new ApiError("Concept introuvable.", 404);

  const mastery = getMasteryStatus(sessionId, conceptId);

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
