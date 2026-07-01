"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetcher";
import { useToast } from "@/components/ui/toast";
import { QuestionCard, type AnswerFeedback } from "@/components/QuestionCard";
import { MasteryMap } from "@/components/MasteryMap";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { nextDifficulty } from "@/lib/mastery";
import type {
  ClientQuestion,
  ConceptWithMastery,
  Confidence,
  MasteryStatus,
} from "@/types";
import { Map as MapIcon, Target } from "lucide-react";

interface SessionData {
  concepts: ConceptWithMastery[];
  questions: ClientQuestion[];
  document: { titre: string } | null;
}

/**
 * Contrôleur du diagnostic adaptatif.
 * - Une question par concept, dans l'ordre pédagogique.
 * - La difficulté de la question suivante s'ajuste à la performance récente.
 * - La carte de maîtrise se met à jour en temps réel après chaque réponse.
 */
export function DiagnosticClient({
  sessionId,
  phase = "diagnostic",
}: {
  sessionId: string;
  phase?: "diagnostic" | "retest";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isRetest = phase === "retest";

  const [data, setData] = useState<SessionData | null>(null);
  const [concepts, setConcepts] = useState<ConceptWithMastery[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // État du parcours adaptatif
  const [step, setStep] = useState(0); // index du concept courant
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [history, setHistory] = useState<boolean[]>([]); // justesse récente
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMapMobile, setShowMapMobile] = useState(false);

  // Chargement initial
  useEffect(() => {
    apiFetch<SessionData>(`/api/sessions/${sessionId}`)
      .then((d) => {
        setData(d);
        setConcepts(d.concepts);
      })
      .catch((e) => setLoadError(e.message));
  }, [sessionId]);

  // Questions indexées par concept pour un accès O(1).
  const byConcept = useMemo(() => {
    const map = new Map<string, ClientQuestion[]>();
    for (const q of data?.questions ?? []) {
      const arr = map.get(q.concept_id) ?? [];
      arr.push(q);
      map.set(q.concept_id, arr);
    }
    return map;
  }, [data]);

  const orderedConcepts = useMemo(
    () => [...(data?.concepts ?? [])].sort((a, b) => a.ordre - b.ordre),
    [data]
  );

  const currentConcept = orderedConcepts[step];
  const total = orderedConcepts.length;

  // Sélectionne la question du concept courant à la difficulté visée
  // (repli sur la difficulté disponible la plus proche).
  const currentQuestion = useMemo<ClientQuestion | null>(() => {
    if (!currentConcept) return null;
    const pool = byConcept.get(currentConcept.id) ?? [];
    if (pool.length === 0) return null;
    const exact = pool.find((q) => q.difficulte === difficulty);
    if (exact) return exact;
    return [...pool].sort(
      (a, b) =>
        Math.abs(a.difficulte - difficulty) -
        Math.abs(b.difficulte - difficulty)
    )[0];
  }, [currentConcept, byConcept, difficulty]);

  async function handleSubmit(selectedIndex: number, confiance: Confidence) {
    if (!currentQuestion) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{
        est_correcte: boolean;
        misconception: boolean;
        correctIndex: number;
        explication: string | null;
        conceptId: string;
        mastery: { score: number; statut: MasteryStatus };
        misconceptionAnalysis: { nature: string; correction: string } | null;
      }>("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          reponseDonnee: selectedIndex,
          confiance,
          phase,
        }),
      });

      setFeedback({
        correctIndex: res.correctIndex,
        selectedIndex,
        est_correcte: res.est_correcte,
        misconception: res.misconception,
        explication: res.explication,
        analysis: res.misconceptionAnalysis,
      });

      // Mise à jour temps réel de la carte de maîtrise.
      setConcepts((prev) =>
        prev.map((c) =>
          c.id === res.conceptId
            ? { ...c, score: res.mastery.score, statut: res.mastery.statut }
            : c
        )
      );
      setHistory((h) => [...h, res.est_correcte]);
    } catch (e) {
      toast({
        variant: "error",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Réessaie.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    const newHistory = history;
    // Calcule la difficulté de la prochaine question (adaptatif).
    setDifficulty((d) => nextDifficulty(d, newHistory));
    setFeedback(null);

    if (step + 1 < total) {
      setStep((s) => s + 1);
    } else {
      // Fin de phase → fige le score et transitionne.
      const nextPhase = isRetest ? "done" : "learning";
      try {
        await apiFetch(`/api/sessions/${sessionId}/phase`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: nextPhase }),
        });
      } catch {
        /* non bloquant : on redirige quand même */
      }
      router.push(isRetest ? `/results/${sessionId}` : `/learn/${sessionId}`);
    }
  }

  // ── États de chargement / erreur ──
  if (loadError) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <p className="text-lg font-semibold">Impossible de charger le diagnostic</p>
        <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  if (!data || !currentConcept) {
    return (
      <div className="container max-w-5xl py-10">
        <Skeleton className="mb-6 h-2.5 w-full" />
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="hidden h-96 rounded-2xl lg:block" />
        </div>
      </div>
    );
  }

  const progressValue = (step / total) * 100;

  return (
    <div className="container max-w-5xl py-8">
      {/* Barre de progression globale */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Target className="h-4 w-4 text-primary" />
            {isRetest ? "Re-test" : "Diagnostic"} · {data.document?.titre}
          </span>
          <span className="text-muted-foreground">
            {step}/{total} concepts
          </span>
        </div>
        <Progress value={progressValue} />
      </div>

      {/* Bouton carte (mobile) */}
      <div className="mb-4 lg:hidden">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowMapMobile((v) => !v)}
        >
          <MapIcon className="h-4 w-4" />
          {showMapMobile ? "Masquer" : "Voir"} la carte de maîtrise
        </Button>
        {showMapMobile && (
          <div className="mt-3 animate-fade-in">
            <MasteryMap concepts={concepts} activeConceptId={currentConcept.id} />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Colonne question */}
        <div>
          {currentQuestion ? (
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              index={step}
              total={total}
              feedback={feedback}
              submitting={submitting}
              onSubmit={handleSubmit}
              onNext={handleNext}
            />
          ) : (
            <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Aucune question disponible pour ce concept.
              <Button variant="link" onClick={handleNext}>
                Passer au suivant
              </Button>
            </div>
          )}
        </div>

        {/* Colonne carte (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <MapIcon className="h-4 w-4 text-primary" />
              Carte de maîtrise (temps réel)
            </h3>
            <MasteryMap concepts={concepts} activeConceptId={currentConcept.id} />
            <p className="mt-3 text-xs text-muted-foreground">
              Les couleurs évoluent à chaque réponse : vert (maîtrisé), jaune
              (fragile), rouge (faux acquis), gris (non testé).
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
