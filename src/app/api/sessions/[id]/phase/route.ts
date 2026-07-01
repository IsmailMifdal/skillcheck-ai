import { withAuth, ok, ApiError } from "@/lib/api";
import { assertSessionOwner } from "@/lib/guards";
import { computeSessionScore } from "@/lib/services";
import { createAdminSupabase } from "@/lib/supabase/server";
import type { SessionPhase } from "@/types";

export const runtime = "nodejs";

/**
 * POST /api/sessions/[id]/phase
 * Fait avancer la session de phase et calcule les scores associés.
 * body: { phase: "learning" | "retest" | "done" }
 */
export const POST = withAuth(async ({ user, req, params }) => {
  const sessionId = params.id;
  await assertSessionOwner(sessionId, user.id);

  const { phase }: { phase: SessionPhase } = await req.json();
  const supabase = createAdminSupabase();

  // À la fin du diagnostic → on fige le score initial.
  if (phase === "learning") {
    await computeSessionScore(sessionId, "diagnostic");
  }
  // À la fin du re-test → on fige le score final.
  if (phase === "done") {
    await computeSessionScore(sessionId, "retest");
  }
  if (!["learning", "retest", "done"].includes(phase)) {
    throw new ApiError("Phase invalide.");
  }

  const { data, error } = await supabase
    .from("sessions")
    .update({ phase })
    .eq("id", sessionId)
    .select("id, phase, score_avant, score_apres")
    .single();
  if (error) throw new ApiError("Échec de la mise à jour de la phase.");

  return ok(data);
});
