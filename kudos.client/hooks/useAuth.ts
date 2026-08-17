"use client";

import { useEffect, useMemo, useState } from "react";

type AuthState = {
  userEmail: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
};

// Auth state is derived from the non-sensitive "userEmail" marker in
// localStorage. The actual credential (JWT) lives in an httpOnly cookie the
// browser sends automatically and JS cannot read.
export function useAuth(): AuthState {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    function syncAuth() {
      setUserEmail(localStorage.getItem("userEmail"));
    }

    syncAuth();
    setIsReady(true);

    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth-changed", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, []);

  return useMemo(
    () => ({
      userEmail,
      isAuthenticated: !!userEmail,
      isReady,
    }),
    [userEmail, isReady]
  );
}
