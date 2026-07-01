// ═══════════════════════════════════════════════════════════════════
// Types partagés — SkillCheck AI
// ═══════════════════════════════════════════════════════════════════

/** Statut de maîtrise d'un concept (code couleur : vert/jaune/rouge/gris). */
export type MasteryStatus =
  | "maitrise" // vert  — bien compris
  | "fragile" // jaune — partiellement compris
  | "misconception" // rouge — faux acquis (faux + confiant)
  | "non_teste"; // gris  — pas encore évalué

/** Niveau de confiance déclaré par l'utilisateur sur une réponse. */
export type Confidence = "sur" | "hesitant";

/** Phase d'un parcours d'apprentissage. */
export type SessionPhase = "diagnostic" | "learning" | "retest" | "done";

/** Phase à laquelle une réponse a été donnée. */
export type AnswerPhase = "diagnostic" | "retest";

export interface Document {
  id: string;
  user_id: string;
  titre: string;
  contenu: string;
  created_at: string;
}

export interface Concept {
  id: string;
  document_id: string;
  nom: string;
  description: string | null;
  ordre: number;
}

export interface Question {
  id: string;
  concept_id: string;
  enonce: string;
  options: string[];
  reponse_correcte: number; // index 0-based
  explication: string | null;
  difficulte: 1 | 2 | 3;
}

/** Question renvoyée au client SANS la bonne réponse (anti-triche). */
export type ClientQuestion = Omit<Question, "reponse_correcte" | "explication">;

export interface Reponse {
  id: string;
  session_id: string;
  question_id: string;
  reponse_donnee: number;
  est_correcte: boolean;
  confiance: Confidence;
  misconception: boolean;
  phase: AnswerPhase;
}

export interface Maitrise {
  id: string;
  session_id: string;
  concept_id: string;
  score: number; // 0-100
  statut: MasteryStatus;
}

export interface Session {
  id: string;
  user_id: string;
  document_id: string;
  phase: SessionPhase;
  score_avant: number | null;
  score_apres: number | null;
  created_at: string;
}

// ── Shapes attendues des réponses LLM (JSON mode) ──

/** Sortie de l'extraction de concepts. */
export interface ExtractedConceptsResult {
  concepts: { nom: string; description: string }[];
}

/** Sortie de la génération de questions. */
export interface GeneratedQuestionsResult {
  questions: {
    enonce: string;
    options: string[];
    reponse_correcte: number;
    explication: string;
    difficulte: 1 | 2 | 3;
  }[];
}

/** Sortie de l'analyse d'une réponse fausse (misconception). */
export interface MisconceptionAnalysisResult {
  nature: string; // ex: "Vous avez confondu la vitesse et l'accélération."
  correction: string; // rappel correct et concis
}

/** Sortie de la génération d'une leçon ciblée (RAG). */
export interface LessonResult {
  explication: string; // explication ancrée sur le document
  citation: string; // extrait du document servant de source
  exercice: {
    enonce: string;
    options: string[];
    reponse_correcte: number;
    explication: string;
  };
}

/** Concept enrichi de son statut de maîtrise — pour l'UI et la carte. */
export interface ConceptWithMastery extends Concept {
  score: number;
  statut: MasteryStatus;
}
