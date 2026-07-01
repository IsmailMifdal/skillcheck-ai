import type { Confidence, MasteryStatus } from "@/types";

// ═══════════════════════════════════════════════════════════════════
// Logique métier : calcul du statut de maîtrise et diagnostic adaptatif.
// Fonctions pures (testables, sans I/O) — isolées de l'UI et de la DB.
// ═══════════════════════════════════════════════════════════════════

export interface AnswerSignal {
  est_correcte: boolean;
  confiance: Confidence;
  difficulte: number; // 1-3
}

/**
 * Détecte un faux acquis (misconception) sur une réponse individuelle :
 * réponse FAUSSE donnée avec CONFIANCE = croyance erronée ancrée.
 */
export function isMisconception(
  est_correcte: boolean,
  confiance: Confidence
): boolean {
  return !est_correcte && confiance === "sur";
}

/**
 * Calcule le statut de maîtrise d'un concept à partir des réponses le concernant.
 *
 * Règles (par priorité) :
 *  - Aucune réponse            → "non_teste" (gris)
 *  - ≥1 faux acquis            → "misconception" (rouge, priorité absolue)
 *  - score ≥ 70 et tout juste  → "maitrise" (vert)
 *  - sinon                     → "fragile" (jaune)
 *
 * Le score (0-100) pondère la justesse par la difficulté et la confiance.
 */
export function computeMastery(answers: AnswerSignal[]): {
  score: number;
  statut: MasteryStatus;
} {
  if (answers.length === 0) {
    return { score: 0, statut: "non_teste" };
  }

  const hasMisconception = answers.some((a) =>
    isMisconception(a.est_correcte, a.confiance)
  );

  // Score pondéré : les questions difficiles pèsent plus.
  let earned = 0;
  let total = 0;
  for (const a of answers) {
    const weight = a.difficulte; // 1..3
    total += weight;
    if (a.est_correcte) {
      // Bonus léger si juste ET sûr (maîtrise consolidée).
      earned += weight * (a.confiance === "sur" ? 1 : 0.85);
    }
  }
  const score = Math.round((earned / total) * 100);

  let statut: MasteryStatus;
  if (hasMisconception) {
    statut = "misconception";
  } else if (score >= 70) {
    statut = "maitrise";
  } else {
    statut = "fragile";
  }

  return { score, statut };
}

/**
 * Diagnostic adaptatif : choisit la difficulté de la prochaine question
 * en fonction de la performance récente (les 2 dernières réponses).
 *
 * - 2 bonnes de suite → on monte en difficulté.
 * - 2 mauvaises de suite → on redescend.
 * - sinon → on reste au même niveau.
 */
export function nextDifficulty(
  current: 1 | 2 | 3,
  recent: boolean[] // justesse des dernières réponses (plus récente en dernier)
): 1 | 2 | 3 {
  const last2 = recent.slice(-2);
  if (last2.length < 2) return current;

  const allCorrect = last2.every((r) => r);
  const allWrong = last2.every((r) => !r);

  if (allCorrect) return Math.min(3, current + 1) as 1 | 2 | 3;
  if (allWrong) return Math.max(1, current - 1) as 1 | 2 | 3;
  return current;
}

/** Métadonnées d'affichage par statut (label + couleur du design system). */
export const STATUS_META: Record<
  MasteryStatus,
  { label: string; color: string; bg: string; text: string; ring: string }
> = {
  maitrise: {
    label: "Maîtrisé",
    color: "hsl(var(--mastery-mastered))",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  fragile: {
    label: "Fragile",
    color: "hsl(var(--mastery-fragile))",
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
  misconception: {
    label: "Faux acquis",
    color: "hsl(var(--mastery-misconception))",
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
  },
  non_teste: {
    label: "Non testé",
    color: "hsl(var(--mastery-untested))",
    bg: "bg-slate-50",
    text: "text-slate-500",
    ring: "ring-slate-200",
  },
};
