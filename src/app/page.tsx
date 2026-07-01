import Link from "next/link";
import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Target,
  GraduationCap,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

// Page d'accueil (publique). Redirige vers le dashboard si déjà connecté.
export default async function LandingPage() {
  const user = await getAuthUser();
  if (user) redirect("/dashboard");

  return (
    <main className="bg-mesh min-h-screen">
      {/* Nav */}
      <nav className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight">
            SkillCheck<span className="text-primary"> AI</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Commencer</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="container flex flex-col items-center pb-16 pt-16 text-center sm:pt-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Copilote d&apos;apprentissage diagnostique
        </div>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Arrête de réviser ce que tu{" "}
          <span className="text-primary">sais déjà.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          SkillCheck AI inverse l&apos;apprentissage : l&apos;IA te{" "}
          <strong className="text-foreground">teste d&apos;abord</strong>,
          détecte tes lacunes et tes faux acquis, puis ne t&apos;enseigne{" "}
          <em>que ce qui te manque</em>. Uploade un cours, et découvre ton
          niveau réel en 5 minutes.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/signup">
              Diagnostiquer mon niveau
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">J&apos;ai déjà un compte</Link>
          </Button>
        </div>
      </section>

      {/* 3 étapes */}
      <section className="container grid gap-6 pb-24 sm:grid-cols-3">
        {[
          {
            icon: <Target className="h-6 w-6" />,
            step: "1 — Tester",
            title: "Diagnostic adaptatif",
            desc: "L'IA extrait les concepts-clés de ton document et te pose des questions dont la difficulté s'ajuste à tes réponses.",
          },
          {
            icon: <GraduationCap className="h-6 w-6" />,
            step: "2 — Apprendre",
            title: "Parcours ciblé",
            desc: "Des explications ancrées sur ton cours (avec citations) et des exercices, uniquement sur tes lacunes.",
          },
          {
            icon: <CheckCircle2 className="h-6 w-6" />,
            step: "3 — Vérifier",
            title: "Progression chiffrée",
            desc: "Un re-test final mesure tes progrès avec un score avant/après. Preuve concrète que tu as progressé.",
          },
        ].map((f) => (
          <div
            key={f.step}
            className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              {f.icon}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {f.step}
            </p>
            <h3 className="mt-1 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Faux acquis — le différenciateur */}
      <section className="container pb-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold">
            Détecte tes <span className="text-red-600">faux acquis</span>
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Une réponse fausse donnée avec assurance est bien plus dangereuse
            qu&apos;un doute. SkillCheck croise ta{" "}
            <strong>confiance</strong> et ta <strong>justesse</strong> pour
            repérer ce que tu crois savoir… à tort. C&apos;est la priorité
            absolue de ton parcours.
          </p>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        SkillCheck AI · Teste-toi avant d&apos;apprendre.
      </footer>
    </main>
  );
}
