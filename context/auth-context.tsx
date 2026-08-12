"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
    AuthUser,
    clearSession,
    getSavedUser,
    isLoggedIn,
    saveSession,
} from "@/lib/auth";
import { loginApi, verifyTotpLogin } from "@/lib/api";

/** What `login` resolved to: a live session, or a pending two-factor challenge. */
export type LoginOutcome =
    | { status: "ok" }
    | { status: "totp_required"; totpToken: string };

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<LoginOutcome>;
    completeTotpLogin: (totpToken: string, code: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Rehydrate from localStorage on mount
    useEffect(() => {
        if (isLoggedIn()) {
            setUser(getSavedUser());
        }
        setIsLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<LoginOutcome> => {
        const result = await loginApi(email, password);

        // Two-factor accounts get no session here — only a challenge to redeem
        // on the verification step.
        if (result.status === "totp_required") {
            return { status: "totp_required", totpToken: result.totpToken };
        }

        saveSession(result.session);
        setUser(result.session.user);
        return { status: "ok" };
    }, []);

    const completeTotpLogin = useCallback(async (totpToken: string, code: string) => {
        const session = await verifyTotpLogin(totpToken, code);
        saveSession(session);
        setUser(session.user);
    }, []);

    const logout = useCallback(() => {
        clearSession();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                completeTotpLogin,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
