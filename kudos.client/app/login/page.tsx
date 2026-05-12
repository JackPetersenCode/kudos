"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { login } from "@/lib/auth";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  async function handleLogin(email: string, password: string) {
    await login(email, password);
    // Only honor same-origin paths to prevent open-redirect attacks
    const target = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";
    router.push(target);
  }

  // Preserve `next` so users who click "Sign up" can come back here after registering
  const registerHref = nextPath
    ? `/register?next=${encodeURIComponent(nextPath)}`
    : "/register";

  return (
    <AuthForm
      title="Welcome back"
      buttonText="Sign in"
      onSubmit={handleLogin}
      altText="Don't have an account?"
      altLink={registerHref}
      altLinkText="Sign up"
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
