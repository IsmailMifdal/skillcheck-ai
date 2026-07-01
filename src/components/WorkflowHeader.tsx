import { FileText, Check, Target, GraduationCap, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStep = "tester" | "apprendre" | "verifier";

const STEPS: {
  key: WorkflowStep;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "tester", label: "Tester", icon: <Target className="h-4 w-4" /> },
  { key: "apprendre", label: "Apprendre", icon: <GraduationCap className="h-4 w-4" /> },
  { key: "verifier", label: "Vérifier", icon: <CheckCircle2 className="h-4 w-4" /> },
];

/**
 * Barre de contexte du parcours : nom du document + progression en 3 étapes
 * (Tester → Apprendre → Vérifier). Donne un repère clair et professionnel
 * sur chaque écran du flux.
 */
export function WorkflowHeader({
  documentTitle,
  active,
}: {
  documentTitle?: string | null;
  active: WorkflowStep;
}) {
  const activeIndex = STEPS.findIndex((s) => s.key === active);

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      {/* Document */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Document
          </p>
          <p className="truncate text-sm font-semibold">
            {documentTitle ?? "…"}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <li key={step.key} className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  current && "bg-primary text-primary-foreground",
                  done && "bg-emerald-100 text-emerald-700",
                  !current && !done && "bg-secondary text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step.icon}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "h-px w-4 sm:w-6",
                    done ? "bg-emerald-300" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
