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
  redirectTo,
}: Props) {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated) {
      // Default: send to /login?next=<current full path> so user lands back here after login.
      // Explicit redirectTo overrides.
      if (redirectTo) {
        router.replace(redirectTo);
      } else {
        // Read URL directly from window — using usePathname/useSearchParams here
        // would require every parent page to be wrapped in Suspense (Next.js
        // build error: "useSearchParams should be wrapped in a suspense boundary").
        const full =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/";
        router.replace(`/login?next=${encodeURIComponent(full)}`);
      }
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