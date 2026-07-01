import { Badge } from "@/components/ui/badge";
import type { MasteryStatus } from "@/types";
import { CheckCircle2, AlertTriangle, ShieldAlert, Circle } from "lucide-react";

// Mappe un statut de maîtrise vers un badge coloré + icône.
const CONFIG: Record<
  MasteryStatus,
  { variant: "mastered" | "fragile" | "misconception" | "untested"; label: string; icon: React.ReactNode }
> = {
  maitrise: {
    variant: "mastered",
    label: "Maîtrisé",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  fragile: {
    variant: "fragile",
    label: "Fragile",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  misconception: {
    variant: "misconception",
    label: "Faux acquis",
    icon: <ShieldAlert className="h-3 w-3" />,
  },
  non_teste: {
    variant: "untested",
    label: "Non testé",
    icon: <Circle className="h-3 w-3" />,
  },
};

export function StatusBadge({
  status,
  className,
  pulse,
}: {
  status: MasteryStatus;
  className?: string;
  pulse?: boolean;
}) {
  const c = CONFIG[status];
  return (
    <Badge
      variant={c.variant}
      className={`${className ?? ""} ${
        pulse && status === "misconception" ? "animate-pulse-ring" : ""
      }`}
    >
      {c.icon}
      {c.label}
    </Badge>
  );
}
