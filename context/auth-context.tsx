"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
    AuthUser,
    clearSession,
    getSavedUser,
    isLoggedIn,
    saveSession,
} from "@/lib/auth";
import { loginApi } from "@/lib/api";

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
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

    const login = useCallback(async (email: string, password: string) => {
        const session = await loginApi(email, password);
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
