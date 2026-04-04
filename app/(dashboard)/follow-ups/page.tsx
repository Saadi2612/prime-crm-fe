"use client";

import { useEffect, useState } from "react";
import { fetchAllFollowUps } from "@/lib/api";
import { FollowUpAlert } from "@/types/leads";
import { useAuth } from "@/context/auth-context";
import { Bell, Clock, User as UserIcon, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

type GroupedFollowUps = {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  follow_ups: FollowUpAlert[];
};

export default function FollowUpsPage() {
  const [data, setData] = useState<FollowUpAlert[] | GroupedFollowUps[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function loadFollowUps() {
      try {
        const response = await fetchAllFollowUps();
        setData(response);
      } catch (error) {
        console.error("Failed to fetch follow-ups:", error);
      } finally {
        setLoading(false);
      }
    }
    loadFollowUps();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Follow Ups</h1>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const renderFollowUpCard = (alert: FollowUpAlert) => {
    const followUpDate = parseISO(alert.next_follow_up);
    const timeStr = format(followUpDate, "h:mm a");
    const dateStr = format(followUpDate, "MMM d, yyyy");

    return (
      <Link href={`/leads/${alert.lead.id}`} key={alert.id} className="block group">
        <div className="relative rounded-xl border border-accent-foreground/20 bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 dark:border-accent-foreground/20 hover:scale-[1.02]">

          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col gap-1 text-sm font-semibold text-accent-foreground dark:text-accent-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {dateStr}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {timeStr}</span>
            </div>
            {alert.lead && (
              <div className="font-semibold text-base text-foreground flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                {alert.lead.full_name}
              </div>
            )}
          </div>

          {alert.body && (
            <div className="text-sm text-muted-foreground mt-2 pl-3 border-l-2 border-accent-foreground/30 dark:border-accent-foreground/20 py-1 bg-background/50 rounded-r-md">
              {alert.body}
            </div>
          )}
        </div>
      </Link>
    );
  };

  const isGroupedData = Array.isArray(data) && data.length > 0 && 'user' in data[0];

  // If no data, we can pretend it's not grouped since it will just show the empty state message.
  // But if the user is an admin from the context, we can still fall back to the grouped view empty state if preferred.
  // The most robust way is to check the shape if it has data.
  const isGroupedView = isGroupedData || (data?.length === 0 && user?.role === "admin");

  return (
    <div className="p-6 space-y-6 w-full max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent-foreground/20 text-accent-foreground rounded-lg">
          <Bell className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Follow Ups</h1>
      </div>

      {!isGroupedView ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data as FollowUpAlert[]).length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              No follow-ups found.
            </div>
          ) : (
            (data as FollowUpAlert[]).map(renderFollowUpCard)
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {(data as GroupedFollowUps[]).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
              No follow-ups found.
            </div>
          ) : (
            (data as GroupedFollowUps[]).map((group) => (
              <div key={group.user.id} className="bg-card overflow-hidden rounded-xl shadow-sm">
                <div className="bg-muted/30 px-4 py-3 border-b flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-accent-foreground/20 flex items-center justify-center text-accent-foreground font-bold uppercase">
                      {group.user.full_name?.charAt(0) || group.user.email?.charAt(0) || "?"}
                    </div>
                    <div>
                      <h2 className="font-semibold leading-none">{group.user.full_name || "Unassigned"}</h2>
                      {group.user.email && <span className="text-xs text-muted-foreground">{group.user.email}</span>}
                    </div>
                  </div>
                  <div className="text-xs font-semibold px-2 py-1 bg-accent-foreground/20 text-accent-foreground rounded-full">
                    {group.follow_ups.length} Tasks
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-background">
                  {group.follow_ups.length > 0 ? (
                    group.follow_ups.map(renderFollowUpCard)
                  ) : (
                    <div className="col-span-full text-sm text-muted-foreground py-2 italic">
                      No pending follow ups.
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
