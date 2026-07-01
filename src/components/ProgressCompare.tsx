"use client";

import { useEffect, useState } from "react";
import { TrendingUp, ArrowRight } from "lucide-react";

/** Compteur animé de 0 → value. */
function useCountUp(value: number, duration = 1000) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

/**
 * Comparaison visuelle avant/après avec compteurs animés et barre de gain.
 * Preuve chiffrée de la progression (écran "Vérifier").
 */
export function ProgressCompare({
  avant,
  apres,
}: {
  avant: number;
  apres: number;
}) {
  const a = useCountUp(avant, 900);
  const b = useCountUp(apres, 1200);
  const gain = apres - avant;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <ScoreBlock label="Avant" value={a} tone="muted" />
        <ArrowRight className="h-6 w-6 text-muted-foreground" />
        <ScoreBlock label="Après" value={b} tone="primary" />
      </div>

      {/* Barre de gain */}
      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progression</span>
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              gain >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            {gain >= 0 ? "+" : ""}
            {gain} points
          </span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-muted-foreground/30 transition-all duration-700"
            style={{ width: `${avant}%` }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000 ease-out"
            style={{ width: `${apres}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ScoreBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "muted" | "primary";
}) {
  return (
    <div className="text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-4xl font-bold tabular-nums sm:text-5xl ${
          tone === "primary" ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {value}
        <span className="text-2xl">%</span>
      </p>
    </div>
  );
}
