import { clock } from "../../data/database/types";
import { uuid } from "../../data/database/uuid";
import type { AuthSession, User } from "./types";

/**
 * PawPair — auth service.
 *
 * docs/AAA-HANDOFF.md §5: "Support Sign in with Apple." Stage 8
 * ships the client-side state machine. The real implementation
 * is wired in stage 8-final once a Supabase project is set up.
 *
 * The stub uses a single in-memory user so the rest of the app
 * can be developed and tested without a backend. It is
 * explicitly marked `__setAuthBackend` so tests can substitute
 * a deterministic backend.
 */

export type AuthBackend = {
  signIn: (provider: "apple" | "local-dev") => Promise<AuthSession>;
  signOut: () => Promise<void>;
  refresh: (token: string) => Promise<AuthSession>;
};

let backend: AuthBackend = {
  async signIn(provider): Promise<AuthSession> {
    const id = uuid();
    return {
      user: {
        id,
        displayName: provider === "apple" ? "Maya Cohen" : "Dev User",
        accentColor: "#EF7B63",
        createdAtUtc: clock.nowIso(),
        archivedAtUtc: null,
      },
      token: `local-${id}`,
      expiresAtUtc: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  },
  async signOut() {},
  async refresh(token): Promise<AuthSession> {
    return {
      user: {
        id: token.replace(/^local-/, ""),
        displayName: "Dev User",
        accentColor: "#EF7B63",
        createdAtUtc: clock.nowIso(),
        archivedAtUtc: null,
      },
      token,
      expiresAtUtc: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  },
};

let session: AuthSession | null = null;

export function __setAuthBackend(next: AuthBackend): void {
  backend = next;
}

export async function signIn(
  provider: "apple" | "local-dev" = "local-dev",
): Promise<AuthSession> {
  session = await backend.signIn(provider);
  return session;
}

export async function signOut(): Promise<void> {
  await backend.signOut();
  session = null;
}

export async function refreshSession(): Promise<AuthSession | null> {
  if (!session) return null;
  try {
    session = await backend.refresh(session.token);
    return session;
  } catch {
    session = null;
    return null;
  }
}

export function currentSession(): AuthSession | null {
  return session;
}

export function currentUser(): User | null {
  return session?.user ?? null;
}

export function __setSessionForTests(next: AuthSession | null): void {
  session = next;
}
