"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetcher";
import { useToast } from "@/components/ui/toast";
import { MasteryMap } from "@/components/MasteryMap";
import { LessonCard } from "@/components/LessonCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { ConceptWithMastery, MasteryStatus } from "@/types";
import { GraduationCap, ShieldAlert, ArrowRight, PartyPopper } from "lucide-react";

interface SessionData {
  concepts: ConceptWithMastery[];
  document: { titre: string } | null;
  session: { score_avant: number | null };
}

// Ordre de priorité pédagogique des statuts (misconception d'abord).
const PRIORITY: Record<MasteryStatus, number> = {
  misconception: 0,
  fragile: 1,
  non_teste: 2,
  maitrise: 3,
};

/**
 * Écran "Apprendre" : parcours ciblé sur les lacunes détectées.
 * Priorise visuellement les faux acquis (misconceptions).
 */
export function LearnClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    apiFetch<SessionData>(`/api/sessions/${sessionId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [sessionId]);

  const { lacunes, mastered, misconceptionCount } = useMemo(() => {
    const concepts = data?.concepts ?? [];
    const sorted = [...concepts].sort(
      (a, b) =>
        PRIORITY[a.statut as MasteryStatus] -
        PRIORITY[b.statut as MasteryStatus]
    );
    return {
      lacunes: sorted.filter((c) => c.statut !== "maitrise"),
      mastered: sorted.filter((c) => c.statut === "maitrise"),
      misconceptionCount: concepts.filter(
        (c) => c.statut === "misconception"
      ).length,
    };
  }, [data]);

  async function startRetest() {
    setStarting(true);
    try {
      await apiFetch(`/api/sessions/${sessionId}/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "retest" }),
      });
      router.push(`/retest/${sessionId}`);
    } catch (e) {
      toast({
        variant: "error",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Réessaie.",
      });
      setStarting(false);
    }
  }

  if (error) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <p className="text-lg font-semibold">Chargement impossible</p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container max-w-5xl space-y-4 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      {/* En-tête */}
      <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-primary">
        <GraduationCap className="h-4 w-4" />
        Étape 2 — Apprendre
      </div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Ton parcours ciblé
      </h1>
      <p className="mt-1 text-muted-foreground">
        On ne revoit que ce qui te manque. Diagnostic initial :{" "}
        <span className="font-semibold text-foreground">
          {data.session.score_avant ?? 0}%
        </span>
        .
      </p>

      {/* Alerte faux acquis */}
      {misconceptionCount > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-700">
              {misconceptionCount} faux acquis à corriger en priorité
            </p>
            <p className="text-sm text-red-600/90">
              Ce sont des notions que tu penses maîtriser, mais sur lesquelles tu
              te trompes. À traiter en premier.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Colonne leçons */}
        <div className="space-y-3">
          {lacunes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center">
              <PartyPopper className="h-10 w-10 text-primary" />
              <p className="font-semibold">Aucune lacune détectée — bravo !</p>
              <p className="text-sm text-muted-foreground">
                Tu maîtrises déjà tous les concepts. Tu peux passer directement
                au re-test pour le confirmer.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-muted-foreground">
                {lacunes.length} concept{lacunes.length > 1 ? "s" : ""} à
                travailler · clique pour générer la leçon
              </p>
              {lacunes.map((c, i) => (
                <LessonCard
                  key={c.id}
                  sessionId={sessionId}
                  concept={c}
                  defaultOpen={i === 0}
                />
              ))}
            </>
          )}

          {/* Concepts déjà maîtrisés (repliés) */}
          {mastered.length > 0 && (
            <div className="mt-6 rounded-xl border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">
                Déjà maîtrisés ({mastered.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {mastered.map((c) => (
                  <div
                    key={c.id}
                    className="inline-flex items-center gap-2 rounded-full border bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
                  >
                    {c.nom}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Colonne carte + CTA */}
        <aside>
          <div className="sticky top-24 space-y-4">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Carte de maîtrise</h3>
              <MasteryMap concepts={data.concepts} />
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <p className="font-semibold">Prêt à mesurer tes progrès ?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Le re-test évalue à nouveau tous les concepts et calcule ton
                score de progression.
              </p>
              <Button
                className="mt-4 w-full"
                size="lg"
                onClick={startRetest}
                disabled={starting}
              >
                {starting ? <Spinner /> : <>Passer au re-test</>}
                {!starting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
