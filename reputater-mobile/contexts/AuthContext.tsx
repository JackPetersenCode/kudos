import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as authLib from "../lib/auth";

type AuthState = {
  token: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  token: null,
  isAuthenticated: false,
  isReady: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync("token").then((t) => {
      setToken(t);
      setIsReady(true);
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        isReady,
        signIn: async (email, password) => {
          await authLib.login(email, password);
          const t = await SecureStore.getItemAsync("token");
          setToken(t);
        },
        signUp: async (email, password) => {
          await authLib.register(email, password);
          const t = await SecureStore.getItemAsync("token");
          setToken(t);
        },
        signOut: async () => {
          await authLib.logout();
          setToken(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
