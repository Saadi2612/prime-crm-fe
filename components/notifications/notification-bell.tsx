"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotificationContext } from "@/context/notification-context";
import type { AppNotification } from "@/types/notifications";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
}) {
  return (
    <button
      onClick={() => !notification.is_read && onRead(notification.id)}
      className={`w-full text-left px-4 py-3 hover:bg-[#F8FAFC] transition-colors border-b border-[#F1F5F9] last:border-0 ${
        !notification.is_read ? "bg-[#EFF6FF]" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {!notification.is_read && (
          <span className="mt-1.5 w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
        )}
        {notification.is_read && <span className="mt-1.5 w-2 h-2 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1E293B] leading-snug">{notification.title}</p>
          <p className="text-xs text-[#64748B] mt-0.5 leading-snug line-clamp-2">{notification.message}</p>
          <p className="text-[11px] text-[#94A3B8] mt-1">{timeAgo(notification.created_at)}</p>
        </div>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationContext();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#475569] hover:bg-[#F4F6F9] transition-colors relative">
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-[#EF4444] flex items-center justify-center text-[10px] font-bold text-white px-0.5 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-lg border border-[#E2E8F0] rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1E293B]">Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-[#2563EB] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[#94A3B8]">
              <Bell className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={markRead} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
