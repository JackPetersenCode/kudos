"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { register } from "@/lib/auth";

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  async function handleRegister(email: string, password: string) {
    await register(email, password);
    const target = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";
    router.push(target);
  }

  const loginHref = nextPath
    ? `/login?next=${encodeURIComponent(nextPath)}`
    : "/login";

  return (
    <AuthForm
      title="Create your account"
      buttonText="Sign up"
      onSubmit={handleRegister}
      altText="Already have an account?"
      altLink={loginHref}
      altLinkText="Sign in"
      showTerms
    />
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}
