"use client";

import type { Confidence } from "@/types";
import { cn } from "@/lib/utils";
import { CircleCheck, CircleHelp } from "lucide-react";

/**
 * Sélecteur de confiance (Sûr / Hésitant).
 * Cœur de la détection des faux acquis : croisé avec la justesse.
 */
export function ConfidenceSelector({
  value,
  onChange,
  disabled,
}: {
  value: Confidence | null;
  onChange: (c: Confidence) => void;
  disabled?: boolean;
}) {
  const options: {
    key: Confidence;
    label: string;
    hint: string;
    icon: React.ReactNode;
    active: string;
  }[] = [
    {
      key: "sur",
      label: "Je suis sûr·e",
      hint: "Je connais la réponse",
      icon: <CircleCheck className="h-4 w-4" />,
      active: "border-primary bg-accent text-accent-foreground",
    },
    {
      key: "hesitant",
      label: "J'hésite",
      hint: "Je ne suis pas certain·e",
      icon: <CircleHelp className="h-4 w-4" />,
      active: "border-amber-400 bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.key)}
          className={cn(
            "flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all disabled:opacity-60",
            value === o.key
              ? o.active
              : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
          )}
        >
          <span className="shrink-0">{o.icon}</span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight">
              {o.label}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {o.hint}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
