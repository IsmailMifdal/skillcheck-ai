import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { UploadDropzone } from "@/components/UploadDropzone";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

// Tableau de bord : upload d'un nouveau cours + historique des parcours.
export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = createAdminSupabase();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, phase, score_avant, score_apres, created_at, documents(titre)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader email={user.email} />

      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        {/* Section upload */}
        <div className="mb-10">
          <div className="mb-1 inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Nouveau diagnostic
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Uploade un cours à diagnostiquer
          </h1>
          <p className="mt-1 text-muted-foreground">
            L&apos;IA va extraire les concepts, tester ton niveau et cibler tes
            lacunes.
          </p>
          <div className="mt-6">
            <UploadDropzone />
          </div>
        </div>

        {/* Historique */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Mes parcours</h2>
          {!sessions || sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              Aucun parcours pour l&apos;instant. Uploade ton premier cours
              ci-dessus 👆
            </div>
          ) : (
            <div className="grid gap-3">
              {sessions.map((s: any) => {
                const href =
                  s.phase === "done"
                    ? `/results/${s.id}`
                    : s.phase === "learning" || s.phase === "retest"
                      ? `/learn/${s.id}`
                      : `/diagnostic/${s.id}`;
                return (
                  <Link
                    key={s.id}
                    href={href}
                    className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {s.documents?.titre ?? "Document"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <PhaseBadge
                        phase={s.phase}
                        avant={s.score_avant}
                        apres={s.score_apres}
                      />
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PhaseBadge({
  phase,
  avant,
  apres,
}: {
  phase: string;
  avant: number | null;
  apres: number | null;
}) {
  if (phase === "done" && apres != null) {
    return (
      <Badge variant="mastered" className="hidden sm:inline-flex">
        {avant ?? 0}% → {apres}%
      </Badge>
    );
  }
  const labels: Record<string, string> = {
    diagnostic: "À tester",
    learning: "En cours",
    retest: "Re-test",
  };
  return (
    <Badge variant="secondary" className="hidden sm:inline-flex">
      {labels[phase] ?? phase}
    </Badge>
  );
}
