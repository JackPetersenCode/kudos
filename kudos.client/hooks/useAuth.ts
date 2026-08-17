"use client";

import { useEffect, useMemo, useState } from "react";

type AuthState = {
  token: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
};

export function useAuth(): AuthState {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    function syncAuth() {
      setToken(localStorage.getItem("token"));
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
      token,
      isAuthenticated: !!token,
      isReady,
    }),
    [token, isReady]
  );
}