"use client";

import { useEffect, useState } from "react";
import { format, isAfter, isBefore, subHours, parseISO } from "date-fns";
import { fetchTodayFollowUps } from "@/lib/api";
import { FollowUpAlert } from "@/types/leads";
import { Bell, Clock, User as UserIcon } from "lucide-react";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export function FollowUpAlerts() {
  const [alerts, setAlerts] = useState<FollowUpAlert[]>([]);
  const [visibleAlerts, setVisibleAlerts] = useState<FollowUpAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await fetchTodayFollowUps();
        setAlerts(data);
      } catch (error) {
        console.error("Failed to fetch follow-ups:", error);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();

    // Refresh alerts every 5 minutes from server
    const fetchInterval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(fetchInterval);
  }, []);

  useEffect(() => {
    // Filter alerts to only show those scheduled within the next hour, and not yet passed
    const updateVisibleAlerts = () => {
      const now = new Date();
      const filtered = alerts.filter(alert => {
        if (!alert.next_follow_up) return false;

        // Z means it's parsed as UTC if string contains it. Since we use parseISO, it handles timezones properly.
        const followUpTime = parseISO(alert.next_follow_up);
        const oneHourBefore = subHours(followUpTime, 1);

        return isAfter(now, oneHourBefore) && isBefore(now, followUpTime);
      });
      // Sort so most imminent tasks are at top
      filtered.sort((a, b) => new Date(a.next_follow_up).getTime() - new Date(b.next_follow_up).getTime());
      setVisibleAlerts(filtered);
    };

    updateVisibleAlerts();
    // Update every minute to add/remove alerts as time passes
    const filterInterval = setInterval(updateVisibleAlerts, 60 * 1000);
    return () => clearInterval(filterInterval);
  }, [alerts]);

  if (loading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center gap-2 text-accent-foreground font-semibold">
          <Bell className="h-4 w-4" /> Upcoming Follow-ups
        </SidebarGroupLabel>
        <SidebarGroupContent className="px-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 w-full rounded-xl opacity-50" />
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (visibleAlerts.length === 0) {
    return null; // hide the whole section if there are no alerts
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2 text-accent-foreground font-semibold relative h-8 mt-2">
        <Bell className="h-4 w-4 text-accent-foreground animate-pulse" />
        <span className="text-accent-foreground font-bold uppercase tracking-wider text-[10px]">Upcoming Follow-ups</span>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-accent-foreground/10 border border-accent-foreground/20 text-accent-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">
          {visibleAlerts.length}
        </div>
      </SidebarGroupLabel>
      <SidebarGroupContent className="px-2 py-1 space-y-2 mt-1">
        {visibleAlerts.map(alert => {
          const timeStr = format(parseISO(alert.next_follow_up), "h:mm a");
          return (
            <Link href={`/leads/${alert.lead.id}`} key={alert.id} className="block group">
              <div className="relative overflow-hidden rounded-xl border border-accent-foreground/20 bg-linear-to-br from-accent-foreground/5 pb-2 shadow-md hover:shadow-lg transition-all duration-300 dark:from-accent-foreground/10 dark:border-accent-foreground/20 hover:scale-105">
                {/* Accent line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-accent-foreground to-accent-foreground/50" />

                {/* Glass reflection */}
                {/* <div className="absolute -inset-x-2 -top-2 h-10 -rotate-12 bg-white/40 blur-md transition-transform group-hover:translate-y-20 duration-700 pointer-events-none dark:bg-white/5" /> */}

                <div className="px-3 pt-3 pb-1">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-accent-foreground dark:text-accent-foreground">
                      <Clock className="h-3 w-3" />
                      {timeStr}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-foreground truncate flex items-center gap-2">
                      <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {alert.lead.full_name}
                    </div>
                    {alert.body && (
                      <div className="text-xs text-muted-foreground line-clamp-2 pl-[22px] border-l-[1.5px] border-accent-foreground/30 dark:border-accent-foreground/20 py-0.5 ml-1.5 mt-1 bg-background/50 rounded-r-md">
                        {alert.body}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
