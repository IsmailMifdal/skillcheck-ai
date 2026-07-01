import Link from "next/link";
import { Sparkles, Plus } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";

/**
 * En-tête applicatif principal (universel).
 * Logo + navigation + action rapide + menu profil utilisateur.
 */
export function AppHeader({ email }: { email?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight">
            SkillCheck<span className="text-primary"> AI</span>
          </span>
        </Link>

        {/* Actions à droite */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex"
          >
            <Link href="/dashboard">
              <Plus className="h-4 w-4" />
              Nouveau diagnostic
            </Link>
          </Button>
          <UserMenu email={email} />
        </div>
      </div>
    </header>
  );
}
