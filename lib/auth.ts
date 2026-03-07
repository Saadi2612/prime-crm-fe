export interface AuthUser {
  id: string;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_active: boolean;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthSession {
  tokens: AuthTokens;
  user: AuthUser;
}

// ── Token storage (localStorage, client-side only) ─────────────────────────

export const TOKEN_KEY = "prime_access";
export const REFRESH_KEY = "prime_refresh";
export const USER_KEY = "prime_user";

export function saveSession(session: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, session.tokens.access);
  localStorage.setItem(REFRESH_KEY, session.tokens.refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  // Also persist in a cookie so Next.js middleware can read it
  document.cookie = `prime_access=${session.tokens.access}; path=/; SameSite=Strict`;
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  // Remove the cookie too
  document.cookie = "prime_access=; path=/; max-age=0";
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getSavedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}
