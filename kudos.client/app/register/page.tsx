"use client";

import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();

  async function handleRegister(email: string, password: string) {
    await register(email, password);
    router.push("/dashboard");
  }

  return (
    <AuthForm
      title="Create your account"
      buttonText="Sign up"
      onSubmit={handleRegister}
      altText="Already have an account?"
      altLink="/login"
      altLinkText="Sign in"
      showTerms
    />
  );
}
