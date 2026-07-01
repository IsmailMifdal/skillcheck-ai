import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { DiagnosticClient } from "@/components/screens/DiagnosticClient";

export const dynamic = "force-dynamic";

export default async function DiagnosticPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader
        email={user.email}
        username={user.user_metadata?.username}
      />
      <DiagnosticClient sessionId={params.sessionId} />
    </div>
  );
}
