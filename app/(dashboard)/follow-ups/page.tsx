"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAllFollowUps } from "@/lib/api";
import { FollowUpAlert } from "@/types/leads";
import { useAuth } from "@/context/auth-context";
import { Bell, User as UserIcon } from "lucide-react";
import {
    format,
    parseISO,
    isPast,
    isToday,
    isYesterday,
    isThisWeek,
    startOfDay,
} from "date-fns";
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

type FilterKey = "all" | "overdue" | "week";

function isOverdue(dateStr: string) {
    const d = parseISO(dateStr);
    return isPast(d) && !isToday(d);
}

function isThisWeekAlert(dateStr: string) {
    return isThisWeek(parseISO(dateStr), { weekStartsOn: 1 });
}

function formatFollowUpDate(dateStr: string): { label: string; overdue: boolean } {
    const d = parseISO(dateStr);
    const overdue = isPast(startOfDay(d)) && !isToday(d);
    let label: string;
    if (isToday(d)) label = "Today";
    else if (isYesterday(d)) label = "Yesterday";
    else label = format(d, "MMM d, yyyy");
    return { label, overdue };
}

function initials(name: string) {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function FollowUpCard({ alert }: { alert: FollowUpAlert }) {
    const { label, overdue } = formatFollowUpDate(alert.next_follow_up);
    const timeStr = format(parseISO(alert.next_follow_up), "hh:mm a");

    return (
        <div
            className={[
                "bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-all",
                overdue ? "border-l-4 border-destructive" : "border-l-4 border-primary",
            ].join(" ")}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={[
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        overdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
                    ].join(" ")}>
                        <UserIcon className="h-4 w-4" />
                    </div>
                    <h4 className="font-bold text-foreground text-sm">{alert.lead.full_name}</h4>
                </div>
                <div className="text-right shrink-0">
                    <span className={[
                        "block text-sm font-medium font-mono",
                        overdue ? "text-destructive" : "text-foreground",
                    ].join(" ")}>
                        {label}
                    </span>
                    <span className="block text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
                        {timeStr}
                    </span>
                </div>
            </div>

            {/* Body */}
            {alert.body && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    {alert.body}
                </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
                {overdue ? (
                    <span className="px-2 py-1 bg-destructive/10 text-destructive text-[10px] font-bold rounded uppercase tracking-wide">
                        Overdue
                    </span>
                ) : (
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-[10px] font-bold rounded uppercase tracking-wide">
                        Follow-up
                    </span>
                )}
                <Link
                    href={`/leads/${alert.lead.id}`}
                    className="px-4 py-1 text-sm font-semibold bg-muted text-foreground rounded-lg hover:bg-muted/70 transition-colors"
                >
                    View Details
                </Link>
            </div>
        </div>
    );
}

export default function FollowUpsPage() {
    const [data, setData] = useState<FollowUpAlert[] | GroupedFollowUps[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>("all");
    const { user } = useAuth();

    useEffect(() => {
        fetchAllFollowUps()
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const isGroupedData = Array.isArray(data) && data.length > 0 && "user" in data[0];
    const isGroupedView = isGroupedData || (data?.length === 0 && user?.role === "admin");

    function applyFilter(alerts: FollowUpAlert[]): FollowUpAlert[] {
        if (filter === "overdue") return alerts.filter((a) => isOverdue(a.next_follow_up));
        if (filter === "week") return alerts.filter((a) => isThisWeekAlert(a.next_follow_up));
        return alerts;
    }

    const filteredFlat = useMemo(() => {
        if (!data || isGroupedView) return [];
        return applyFilter(data as FollowUpAlert[]);
    }, [data, filter, isGroupedView]);

    const filteredGrouped = useMemo(() => {
        if (!data || !isGroupedView) return [];
        return (data as GroupedFollowUps[])
            .map((g) => ({ ...g, follow_ups: applyFilter(g.follow_ups) }))
            .filter((g) => g.follow_ups.length > 0 || filter === "all");
    }, [data, filter, isGroupedView]);

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex-1 min-h-full bg-[#EFF3F8]">
                <div className="p-8 max-w-6xl mx-auto space-y-8">
                    <div className="flex items-end justify-between">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-36" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                        </div>
                        <Skeleton className="h-9 w-56 rounded-xl" />
                    </div>
                    <div className="space-y-8">
                        {[0, 1].map((i) => (
                            <div key={i} className="space-y-4">
                                <Skeleton className="h-12 w-full rounded-xl" />
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    <Skeleton className="h-44 rounded-xl" />
                                    <Skeleton className="h-44 rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const FILTERS: { key: FilterKey; label: string }[] = [
        { key: "all", label: "All Tasks" },
        { key: "overdue", label: "Overdue" },
        { key: "week", label: "This Week" },
    ];

    return (
        <div className="flex-1 min-h-full bg-[#EFF3F8]">
            <div className="p-8 max-w-6xl mx-auto w-full space-y-8">

                {/* ── Page header ───────────────────────────────────────────── */}
                <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Bell className="h-5 w-5" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Follow Ups</h1>
                        </div>
                        <p className="text-muted-foreground text-sm pl-1">
                            Manage your team&apos;s scheduled tasks and priority touchpoints.
                        </p>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-1 p-1 bg-card rounded-xl shadow-sm">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={[
                                    "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                    filter === f.key
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                ].join(" ")}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Content ───────────────────────────────────────────────── */}
                {!isGroupedView ? (
                    /* Agent view — flat list */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {filteredFlat.length === 0 ? (
                            <div className="col-span-full py-14 text-center text-muted-foreground bg-card rounded-xl border border-dashed">
                                No follow-ups found.
                            </div>
                        ) : (
                            filteredFlat.map((alert) => (
                                <FollowUpCard key={alert.id} alert={alert} />
                            ))
                        )}
                    </div>
                ) : (
                    /* Admin/manager view — grouped by agent */
                    <div className="space-y-10">
                        {filteredGrouped.length === 0 ? (
                            <div className="py-14 text-center text-muted-foreground bg-card rounded-xl border border-dashed">
                                No follow-ups found.
                            </div>
                        ) : (
                            filteredGrouped.map((group) => {
                                const taskCount = group.follow_ups.length;
                                return (
                                    <section key={group.user.id}>
                                        {/* Group header */}
                                        <div className="flex items-center justify-between mb-5 px-1">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                    {initials(group.user.full_name || group.user.email)}
                                                </div>
                                                <div>
                                                    <h2 className="text-base font-bold text-foreground leading-tight">
                                                        {group.user.full_name || "Unassigned"}
                                                    </h2>
                                                    {group.user.email && (
                                                        <p className="text-sm text-muted-foreground">{group.user.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-tight">
                                                {taskCount} Task{taskCount !== 1 ? "s" : ""}
                                            </span>
                                        </div>

                                        {/* Cards grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                            {group.follow_ups.length === 0 ? (
                                                <div className="col-span-full text-sm text-muted-foreground py-3 italic">
                                                    No pending follow-ups.
                                                </div>
                                            ) : (
                                                group.follow_ups.map((alert) => (
                                                    <FollowUpCard key={alert.id} alert={alert} />
                                                ))
                                            )}
                                        </div>
                                    </section>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
