"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  children: React.ReactNode;
  redirectTo?: string;
};

export default function RequireAuth({
  children,
  redirectTo = "/login",
}: Props) {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated) {
      router.replace(redirectTo);
    } else {
      setShow(true);
    }
  }, [isAuthenticated, isReady, redirectTo, router]);

  return (
    <div style={{ visibility: show ? "visible" : "hidden" }}>
      {children}
    </div>
  );
}