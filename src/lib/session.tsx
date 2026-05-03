import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * Lightweight user type — no Supabase dependency.
 * Until Google Auth is integrated, every session uses a single local user.
 */
export interface AppUser {
  id: string;
  email: string;
  is_anonymous: boolean;
}

interface SessionCtx {
  user: AppUser;
  loading: false;
  signOut: () => Promise<void>;
}

const LOCAL_USER: AppUser = {
  id: "local-dev-user",
  email: "dev@localhost",
  is_anonymous: false,
};

const Ctx = createContext<SessionCtx>({
  user: LOCAL_USER,
  loading: false,
  signOut: async () => {},
});

/** Provides a hardcoded local user — replace with Google OAuth later. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useMemo<SessionCtx>(
    () => ({
      user: LOCAL_USER,
      loading: false,
      signOut: async () => {
        // Will call Google sign-out once auth is wired in
        console.log("Sign-out placeholder");
      },
    }),
    [],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  return useContext(Ctx);
}
