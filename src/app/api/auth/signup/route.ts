import { createAdminSupabase } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();
    const cleanUsername = typeof username === "string" ? username.trim() : "";

    if (typeof email !== "string" || !email.includes("@")) {
      return fail("Adresse e-mail invalide.", 400);
    }

    if (cleanUsername.length < 2 || cleanUsername.length > 32) {
      return fail(
        "Le nom d'utilisateur doit contenir entre 2 et 32 caractères.",
        400
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return fail("Le mot de passe doit contenir au moins 6 caractères.", 400);
    }

    const supabase = createAdminSupabase();
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username: cleanUsername,
      },
    });

    if (error) {
      const message = error.message.toLowerCase();

      if (message.includes("already") || message.includes("registered")) {
        return fail(
          "Un compte existe déjà avec cette adresse e-mail. Connecte-toi plutôt.",
          409
        );
      }

      return fail(error.message, error.status || 400);
    }

    return ok({ success: true }, 201);
  } catch (err) {
    console.error("[signup] Erreur non gérée :", err);
    return fail("Impossible de créer le compte pour le moment.", 500);
  }
}
