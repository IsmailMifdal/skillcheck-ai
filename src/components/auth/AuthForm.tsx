"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/fetcher";
import { Sparkles } from "lucide-react";

function getAuthErrorMessage(err: unknown) {
  if (!(err instanceof Error)) {
    return "Une erreur est survenue. Réessaie dans quelques instants.";
  }

  const authError = err as Error & { code?: string; status?: number };

  if (authError.code === "invalid_credentials") {
    return "Adresse e-mail ou mot de passe incorrect.";
  }

  if (authError.message.toLowerCase().includes("already registered")) {
    return "Un compte existe déjà avec cette adresse e-mail. Connecte-toi plutôt.";
  }

  return err.message;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";
  const redirectTo = params.get("redirect") || "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      } else {
        await apiFetch<{ success: true }>("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, username }),
        });

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      toast({
        variant: "error",
        title: "Échec de l'authentification",
        description: getAuthErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isLogin ? "Bon retour 👋" : "Crée ton compte"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLogin
            ? "Connecte-toi pour reprendre ton apprentissage."
            : "Commence à diagnostiquer tes lacunes en 2 minutes."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
      >
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="username">Nom d&apos;utilisateur</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              required
              minLength={2}
              maxLength={32}
              placeholder="behnood"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="toi@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={6}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Spinner />}
          {isLogin ? "Se connecter" : "Créer mon compte"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
        <Link
          href={isLogin ? "/signup" : "/login"}
          className="font-semibold text-primary hover:underline"
        >
          {isLogin ? "Inscris-toi" : "Connecte-toi"}
        </Link>
      </p>
    </div>
  );
}
