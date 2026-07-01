import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <main className="bg-mesh flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
