"use client";

import { useState, useEffect } from "react";
import type { ClientQuestion, Confidence } from "@/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfidenceSelector } from "@/components/ConfidenceSelector";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  ShieldAlert,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

export interface AnswerFeedback {
  correctIndex: number;
  selectedIndex: number;
  est_correcte: boolean;
  misconception: boolean;
  explication: string | null;
  analysis: { nature: string; correction: string } | null;
}

const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Facile",
  2: "Intermédiaire",
  3: "Difficile",
};

/**
 * Carte de question du diagnostic : sélection d'une option + niveau de confiance,
 * puis affichage du feedback (correct / faux / faux acquis + analyse de l'erreur).
 */
export function QuestionCard({
  question,
  index,
  total,
  feedback,
  submitting,
  onSubmit,
  onNext,
}: {
  question: ClientQuestion;
  index: number;
  total: number;
  feedback: AnswerFeedback | null;
  submitting: boolean;
  onSubmit: (selectedIndex: number, confiance: Confidence) => void;
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confiance, setConfiance] = useState<Confidence | null>(null);

  // Réinitialise l'état local à chaque nouvelle question.
  useEffect(() => {
    setSelected(null);
    setConfiance(null);
  }, [question.id]);

  const answered = feedback !== null;
  const canSubmit = selected !== null && confiance !== null && !submitting;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7 animate-fade-in">
      {/* En-tête : progression + difficulté */}
      <div className="mb-5 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Question {index + 1}/{total}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            question.difficulte === 1 && "bg-emerald-100 text-emerald-700",
            question.difficulte === 2 && "bg-amber-100 text-amber-700",
            question.difficulte === 3 && "bg-red-100 text-red-700"
          )}
        >
          {DIFFICULTY_LABEL[question.difficulte]}
        </span>
      </div>

      {/* Énoncé */}
      <h2 className="text-lg font-semibold leading-snug sm:text-xl">
        {question.enonce}
      </h2>

      {/* Options */}
      <div className="mt-5 grid gap-2.5">
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = answered && i === feedback.correctIndex;
          const isWrongPick =
            answered && i === feedback.selectedIndex && !feedback.est_correcte;

          return (
            <button
              key={i}
              type="button"
              disabled={answered || submitting}
              onClick={() => setSelected(i)}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-3.5 text-left text-sm transition-all disabled:cursor-default",
                !answered &&
                  (isSelected
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/40 hover:bg-secondary/50"),
                isCorrect && "border-emerald-400 bg-emerald-50",
                isWrongPick && "border-red-400 bg-red-50"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  !answered && isSelected && "border-primary text-primary",
                  !answered && !isSelected && "border-border text-muted-foreground",
                  isCorrect && "border-emerald-500 bg-emerald-500 text-white",
                  isWrongPick && "border-red-500 bg-red-500 text-white"
                )}
              >
                {isCorrect ? (
                  <Check className="h-4 w-4" />
                ) : isWrongPick ? (
                  <X className="h-4 w-4" />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              <span className="min-w-0 flex-1 font-medium">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Zone confiance + validation, OU feedback */}
      {!answered ? (
        <div className="mt-6 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">
              À quel point es-tu sûr·e de ta réponse ?
            </p>
            <ConfidenceSelector
              value={confiance}
              onChange={setConfiance}
              disabled={submitting}
            />
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={!canSubmit}
            onClick={() => selected !== null && confiance && onSubmit(selected, confiance)}
          >
            {submitting ? <Spinner /> : "Valider ma réponse"}
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4 animate-fade-in">
          {/* Bannière de résultat */}
          {feedback.misconception ? (
            <div className="flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4 animate-pulse-ring">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-700">
                  Faux acquis détecté !
                </p>
                <p className="text-sm text-red-600/90">
                  Tu étais sûr·e de toi, mais la réponse est fausse. C&apos;est
                  le type d&apos;erreur le plus important à corriger.
                </p>
              </div>
            </div>
          ) : feedback.est_correcte ? (
            <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
              <Check className="h-5 w-5 shrink-0 text-emerald-600" />
              <p className="font-semibold text-emerald-700">
                Correct ! Bien joué.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
              <X className="h-5 w-5 shrink-0 text-amber-600" />
              <p className="font-semibold text-amber-700">
                Pas tout à fait — mais tu hésitais, c&apos;est déjà un bon signe
                de lucidité.
              </p>
            </div>
          )}

          {/* Analyse de l'erreur (nature de la misconception) */}
          {feedback.analysis && !feedback.est_correcte && (
            <div className="rounded-xl border bg-secondary/40 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Lightbulb className="h-4 w-4 text-primary" />
                Analyse de ton erreur
              </div>
              <p className="text-sm text-muted-foreground">
                {feedback.analysis.nature}
              </p>
              <p className="mt-2 text-sm">
                <span className="font-medium">La bonne approche : </span>
                {feedback.analysis.correction}
              </p>
            </div>
          )}

          {/* Explication de la bonne réponse */}
          {feedback.explication && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Explication : </span>
              {feedback.explication}
            </p>
          )}

          <Button className="w-full" size="lg" onClick={onNext}>
            {index + 1 < total ? "Question suivante" : "Voir mes résultats"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
