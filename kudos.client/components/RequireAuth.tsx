"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
        const qs = searchParams.toString();
        const full = qs ? `${pathname}?${qs}` : pathname;
        router.replace(`/login?next=${encodeURIComponent(full)}`);
      }
    } else {
      setShow(true);
    }
  }, [isAuthenticated, isReady, redirectTo, router, pathname, searchParams]);

  return (
    <div style={{ visibility: show ? "visible" : "hidden" }}>
      {children}
    </div>
  );
}