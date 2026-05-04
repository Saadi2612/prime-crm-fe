"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { fetchUnassignedLeads, fetchTeamMembers, type TeamMember } from "@/lib/api";
import type { Lead } from "@/types/leads";
import { NewLeadCard } from "@/components/leads/new-lead-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Inbox, RefreshCw, ShieldOff, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

function CardSkeleton() {
    return (
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <div className="w-full space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg mt-1" />
        </div>
    );
}

export default function NewLeadsPage() {
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);

    const isAdmin = user?.role === "admin";
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const loadData = (p = page) => {
        if (!isAdmin) return;
        setIsLoading(true);
        setError(null);
        Promise.all([fetchUnassignedLeads(p), fetchTeamMembers()])
            .then(([{ results, count, page_size }, membersData]) => {
                setLeads(results);
                setPageSize(page_size);
                setTotalCount(count);
                setTeamMembers(membersData);
            })
            .catch((e: Error) => setError(e.message))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadData(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, page]);

    function handleAssigned(leadId: string) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        setTotalCount((prev) => Math.max(0, prev - 1));
    }

    function goToPage(p: number) {
        if (p < 1 || p > totalPages || p === page) return;
        setPage(p);
    }

    if (!isAdmin) {
        return (
            <div className="px-8 py-7">
                <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                        <ShieldOff className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                            The New Leads page is only available to administrators.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-full" style={{ background: "#EFF3F8" }}>
            <div className="px-8 py-7">
                {/* Page header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <Inbox className="h-6 w-6" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">New Leads</h1>
                        </div>
                        {isLoading ? (
                            <Skeleton className="h-5 w-56 mt-1 ml-14" />
                        ) : (
                            <p className="text-muted-foreground font-medium ml-14">
                                {totalCount} unassigned lead{totalCount !== 1 ? "s" : ""} waiting in the queue
                            </p>
                        )}
                    </div>

                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 border-2 border-primary/20 text-primary hover:bg-primary/5 font-semibold self-start md:self-auto"
                        onClick={() => loadData(page)}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh Feed
                    </Button>
                </div>

                {/* Error state */}
                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 mb-8">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-destructive">Failed to load leads</p>
                            <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => loadData(page)}
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Retry
                        </Button>
                    </div>
                )}

                {/* Loading skeleton grid */}
                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                            <CardSkeleton key={i} />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && !error && leads.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center py-24">
                        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                            <Inbox className="h-8 w-8 text-muted-foreground/60" />
                        </div>
                        <p className="text-foreground font-medium">All caught up!</p>
                        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                            There are no unassigned leads right now. New leads without an assignee will appear here.
                        </p>
                    </div>
                )}

                {/* Lead cards grid */}
                {!isLoading && leads.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {leads.map((lead) => (
                            <NewLeadCard
                                key={lead.id}
                                lead={lead}
                                teamMembers={teamMembers}
                                onAssigned={handleAssigned}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination footer */}
                {!isLoading && !error && totalCount > 0 && (
                    <div className="mt-10 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground font-medium">
                            Showing {Math.min((page - 1) * pageSize + 1, totalCount)}-{Math.min(page * pageSize, totalCount)} of{" "}
                            <span className="text-foreground font-bold">{totalCount} pending leads</span>
                        </p>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => goToPage(page - 1)}
                                disabled={page === 1}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-card border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((item, idx) =>
                                    item === "…" ? (
                                        <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-muted-foreground text-sm">
                                            …
                                        </span>
                                    ) : (
                                        <button
                                            key={item}
                                            onClick={() => goToPage(item as number)}
                                            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                                                item === page
                                                    ? "bg-primary text-primary-foreground shadow-md"
                                                    : "bg-card border border-border text-foreground hover:bg-muted"
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    )
                                )}

                            <button
                                onClick={() => goToPage(page + 1)}
                                disabled={page === totalPages}
                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-card border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
