// src/app/login/page.tsx
"use client";

import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  async function handleLogin(email: string, password: string) {
    await login(email, password);
    router.push("/dashboard");
  }

  return (
    <AuthForm
      title="Login"
      buttonText="Sign in"
      onSubmit={handleLogin}
    />
  );
}