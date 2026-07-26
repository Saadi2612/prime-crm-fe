"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getWsBaseUrl, fetchNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { AppNotification } from "@/types/notifications";

const SOUND_LEAD = "/sounds/notify-lead.mp3.wav";
const SOUND_FOLLOWUP = "/sounds/notify-followup.mp3.wav";

const LEAD_SOUND_TYPES = new Set(["lead_assigned", "lead_transferred", "lead_bounced"]);

function playSound(type: string) {
  const src = type === "follow_up_reminder" ? SOUND_FOLLOWUP : LEAD_SOUND_TYPES.has(type) ? SOUND_LEAD : null;
  if (!src) return;
  try {
    new Audio(src).play().catch(() => {});
  } catch {
    // autoplay blocked — silently ignore
  }
}

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const BACKLOG_GRACE_MS = 1500;

export interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  connected: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(enabled: boolean): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(RECONNECT_BASE_MS);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});
  const suppressSoundRef = useRef(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addOrUpdate = useCallback((incoming: AppNotification) => {
    setNotifications((prev) => {
      const idx = prev.findIndex((n) => n.id === incoming.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = incoming;
        return next;
      }
      return [incoming, ...prev];
    });
  }, []);

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token || unmountedRef.current) return;

    const ws = new WebSocket(`${getWsBaseUrl()}/ws/notifications/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return; }
      setConnected(true);
      reconnectDelay.current = RECONNECT_BASE_MS;

      // Backend replays the unread backlog right after connect — suppress
      // sound for that burst so a fresh login doesn't ring once per item.
      suppressSoundRef.current = true;
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = setTimeout(() => {
        suppressSoundRef.current = false;
      }, BACKLOG_GRACE_MS);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as AppNotification;
        if (data?.id && data?.type) {
          addOrUpdate(data);
          if (!data.is_read && !suppressSoundRef.current) playSound(data.type);
        }
      } catch {
        // malformed message — ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (unmountedRef.current) return;
      const delay = reconnectDelay.current;
      reconnectDelay.current = Math.min(delay * 2, RECONNECT_MAX_MS);
      reconnectTimer.current = setTimeout(() => connectRef.current(), delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [addOrUpdate]);

  // Keep ref in sync so onclose always calls latest connect
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Initial REST load + WebSocket connect
  useEffect(() => {
    if (!enabled) return;
    unmountedRef.current = false;

    fetchNotifications()
      .then((data) => {
        if (!unmountedRef.current) setNotifications(data);
      })
      .catch(() => {});

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
      wsRef.current?.close();
    };
  }, [enabled, connect]);

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "mark_read", id }));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "mark_all_read" }));
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, connected, markRead, markAllRead };
}
