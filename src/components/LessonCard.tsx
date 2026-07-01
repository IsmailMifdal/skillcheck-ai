"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/fetcher";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConceptWithMastery, LessonResult, MasteryStatus } from "@/types";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Quote,
  Sparkles,
  Check,
  X,
  ChevronDown,
} from "lucide-react";

/**
 * Carte d'apprentissage d'un concept en lacune :
 * génère à la demande une leçon ancrée sur le document (RAG + citation)
 * et un exercice d'application interactif.
 */
export function LessonCard({
  sessionId,
  concept,
  defaultOpen,
}: {
  sessionId: string;
  concept: ConceptWithMastery;
  defaultOpen?: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(!!defaultOpen);
  const [lesson, setLesson] = useState<LessonResult | null>(null);
  const [loading, setLoading] = useState(false);

  // État de l'exercice
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  async function generate() {
    if (lesson || loading) return;
    setLoading(true);
    try {
      const { lesson } = await apiFetch<{ lesson: LessonResult }>(
        "/api/learn",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, conceptId: concept.id }),
        }
      );
      setLesson(lesson);
    } catch (e) {
      toast({
        variant: "error",
        title: "Génération impossible",
        description: e instanceof Error ? e.message : "Réessaie.",
      });
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) generate();
  }

  const isMisconception = concept.statut === "misconception";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow",
        isMisconception && "border-red-200 ring-1 ring-red-100"
      )}
    >
      {/* En-tête cliquable */}
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-secondary/40"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              isMisconception
                ? "bg-red-100 text-red-600"
                : "bg-accent text-accent-foreground"
            )}
          >
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{concept.nom}</p>
            {concept.description && (
              <p className="truncate text-sm text-muted-foreground">
                {concept.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={concept.statut as MasteryStatus} pulse />
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Contenu */}
      {open && (
        <div className="border-t p-5 animate-fade-in">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          )}

          {!loading && lesson && (
            <div className="space-y-5">
              {/* Explication */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="h-4 w-4" />
                  Explication
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {lesson.explication}
                </p>
              </div>

              {/* Citation source (RAG) */}
              {lesson.citation && (
                <blockquote className="flex gap-3 rounded-xl border-l-4 border-primary/40 bg-secondary/50 p-4">
                  <Quote className="h-4 w-4 shrink-0 text-primary/60" />
                  <div>
                    <p className="text-sm italic text-muted-foreground">
                      « {lesson.citation} »
                    </p>
                    <p className="mt-1 text-xs font-medium text-primary/70">
                      Extrait de ton document
                    </p>
                  </div>
                </blockquote>
              )}

              {/* Exercice interactif */}
              {lesson.exercice && (
                <div className="rounded-xl border bg-background p-4">
                  <p className="mb-3 text-sm font-semibold">
                    ✍️ Exercice d&apos;application
                  </p>
                  <p className="mb-3 text-sm">{lesson.exercice.enonce}</p>
                  <div className="grid gap-2">
                    {lesson.exercice.options.map((opt, i) => {
                      const correct = i === lesson.exercice.reponse_correcte;
                      const chosen = picked === i;
                      return (
                        <button
                          key={i}
                          disabled={revealed}
                          onClick={() => {
                            setPicked(i);
                            setRevealed(true);
                          }}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border-2 p-2.5 text-left text-sm transition-all disabled:cursor-default",
                            !revealed &&
                              "border-border hover:border-primary/40 hover:bg-secondary/50",
                            revealed && correct && "border-emerald-400 bg-emerald-50",
                            revealed &&
                              chosen &&
                              !correct &&
                              "border-red-400 bg-red-50"
                          )}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                            {revealed && correct ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : revealed && chosen && !correct ? (
                              <X className="h-3.5 w-3.5 text-red-600" />
                            ) : (
                              String.fromCharCode(65 + i)
                            )}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {revealed && (
                    <p className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground animate-fade-in">
                      {lesson.exercice.explication}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
