"use client";

import React, { createContext, useContext } from "react";
import { useAuth } from "@/context/auth-context";
import { useNotifications, UseNotificationsReturn } from "@/hooks/use-notifications";

const NotificationContext = createContext<UseNotificationsReturn | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const value = useNotifications(isAuthenticated);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): UseNotificationsReturn {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be used inside <NotificationProvider>");
  return ctx;
}
