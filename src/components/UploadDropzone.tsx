"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetcher";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Étapes affichées pendant l'ingestion (upload long → feedback rassurant).
const STEPS = [
  "Lecture du document…",
  "Vectorisation (RAG)…",
  "Extraction des concepts-clés…",
  "Génération du diagnostic…",
];

export function UploadDropzone() {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const pickFile = (f: File | null) => {
    if (!f) return;
    const ok =
      f.type === "application/pdf" ||
      f.type.startsWith("text/") ||
      /\.(pdf|txt|md)$/i.test(f.name);
    if (!ok) {
      toast({
        variant: "error",
        title: "Format non supporté",
        description: "Choisis un PDF ou un fichier texte (.txt, .md).",
      });
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setStepIndex(0);

    // Fait défiler les étapes pour un feedback vivant (purement cosmétique).
    const ticker = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 4000);

    try {
      const form = new FormData();
      form.append("file", file);
      const { sessionId } = await apiFetch<{ sessionId: string }>(
        "/api/documents",
        { method: "POST", body: form }
      );
      toast({
        variant: "success",
        title: "Diagnostic prêt !",
        description: "Redirection vers ton test…",
      });
      router.push(`/diagnostic/${sessionId}`);
    } catch (err) {
      toast({
        variant: "error",
        title: "Échec de l'analyse",
        description: err instanceof Error ? err.message : "Réessaie.",
      });
      setLoading(false);
    } finally {
      clearInterval(ticker);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-card p-12 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div>
          <p className="font-semibold">Analyse en cours…</p>
          <p className="mt-1 text-sm text-muted-foreground">{STEPS[stepIndex]}</p>
        </div>
        <div className="mt-2 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-8 rounded-full transition-colors",
                i <= stepIndex ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="max-w-xs text-xs text-muted-foreground">
          Cela peut prendre 20 à 40 secondes selon la taille du document.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && inputRef.current?.click()
        }
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card p-10 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dragging
            ? "border-primary bg-accent"
            : "border-border hover:border-primary/50 hover:bg-secondary/50"
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <UploadCloud className="h-7 w-7" />
        </div>
        <div>
          <p className="font-semibold">
            Dépose ton cours ici ou clique pour choisir
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF ou texte · 8 Mo max
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 animate-fade-in">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} Ko
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFile(null)}
              aria-label="Retirer"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={handleUpload}>Lancer le diagnostic</Button>
          </div>
        </div>
      )}
    </div>
  );
}
