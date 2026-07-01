import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { DiagnosticClient } from "@/components/screens/DiagnosticClient";

export const dynamic = "force-dynamic";

// Le re-test réutilise le contrôleur de diagnostic en phase "retest".
export default async function RetestPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader email={user.email} />
      <DiagnosticClient sessionId={params.sessionId} phase="retest" />
    </div>
  );
}
