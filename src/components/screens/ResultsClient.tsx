"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/fetcher";
import { ProgressCompare } from "@/components/ProgressCompare";
import { MasteryMap } from "@/components/MasteryMap";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkflowHeader } from "@/components/WorkflowHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConceptWithMastery, MasteryStatus } from "@/types";
import { CheckCircle2, Home, Trophy } from "lucide-react";

interface SessionData {
  concepts: ConceptWithMastery[];
  document: { titre: string } | null;
  session: { score_avant: number | null; score_apres: number | null };
}

/**
 * Écran "Vérifier" : score de progression avant/après + carte finale.
 */
export function ResultsClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SessionData>(`/api/sessions/${sessionId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [sessionId]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-20 text-center">
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
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const avant = data.session.score_avant ?? 0;
  const apres = data.session.score_apres ?? 0;
  const gain = apres - avant;

  return (
    <div className="mx-auto w-full max-w-3xl overflow-x-clip px-4 py-8">
      <WorkflowHeader documentTitle={data.document?.titre} active="verifier" />

      {/* En-tête célébration */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Trophy className="h-7 w-7" />
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Étape 3 — Vérifier
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {gain > 0
            ? "Tu as progressé ! 🎉"
            : "Parcours terminé"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {data.document?.titre}
        </p>
      </div>

      {/* Comparaison avant/après */}
      <ProgressCompare avant={avant} apres={apres} />

      {/* Carte finale */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Carte de maîtrise finale</h2>
        <MasteryMap concepts={data.concepts} />
      </div>

      {/* Détail par concept */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Détail par concept</h2>
        <div className="grid gap-2">
          {[...data.concepts]
            .sort((a, b) => a.ordre - b.ordre)
            .map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    Score : {c.score}%
                  </p>
                </div>
                <StatusBadge status={c.statut as MasteryStatus} />
              </div>
            ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button className="flex-1" size="lg" asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            Nouveau diagnostic
          </Link>
        </Button>
      </div>
    </div>
  );
}
