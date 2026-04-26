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
      title="Welcome back"
      buttonText="Sign in"
      onSubmit={handleLogin}
      altText="Don't have an account?"
      altLink="/register"
      altLinkText="Sign up"
    />
  );
}
