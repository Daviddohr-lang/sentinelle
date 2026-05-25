import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-50 dark:bg-ink-950" />}>
      <LoginForm />
    </Suspense>
  );
}
