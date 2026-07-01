"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { LayoutDashboard, LogOut, User, ChevronDown } from "lucide-react";

/**
 * Menu profil utilisateur : avatar (initiales) + dropdown
 * (email, accès tableau de bord, déconnexion). Ferme au clic extérieur / Échap.
 */
export function UserMenu({ email }: { email?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur et à la touche Échap.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Initiales à partir de l'email (avant le @).
  const initials = (email?.split("@")[0] ?? "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-full border bg-card p-1 pr-2 text-sm transition-colors hover:bg-secondary",
          open && "bg-secondary"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initials}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-xl border bg-card shadow-lg animate-fade-in"
        >
          {/* Bloc identité */}
          <div className="flex items-center gap-3 border-b bg-secondary/40 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Connecté en tant que</p>
              <p className="truncate text-sm font-medium">{email}</p>
            </div>
          </div>

          {/* Liens */}
          <nav className="p-1.5">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-secondary"
              role="menuitem"
            >
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              Tableau de bord
            </Link>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
