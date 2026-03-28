"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { fetchUnassignedLeads, fetchTeamMembers, type TeamMember } from "@/lib/api";
import type { Lead } from "@/types/leads";
import { NewLeadCard } from "@/components/leads/new-lead-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Inbox, RefreshCw, ShieldOff, AlertTriangle } from "lucide-react";

function CardSkeleton() {
    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        </div>
    );
}

export default function NewLeadsPage() {
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = user?.role === "admin";

    const loadData = () => {
        if (!isAdmin) return;
        setIsLoading(true);
        setError(null);
        Promise.all([fetchUnassignedLeads(), fetchTeamMembers()])
            .then(([leadsData, membersData]) => {
                setLeads(leadsData);
                setTeamMembers(membersData);
            })
            .catch((e: Error) => setError(e.message))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    function handleAssigned(leadId: string) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
    }

    // Access guard — non-admins see a friendly "no access" state
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 h-full gap-4 text-center px-4">
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
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Page header */}
            <div className="flex items-start justify-between mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Inbox className="h-6 w-6 text-primary" />
                        New Leads
                    </h1>
                    {isLoading ? (
                        <Skeleton className="h-4 w-36 mt-1" />
                    ) : (
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {leads.length} unassigned lead{leads.length !== 1 ? "s" : ""} waiting for assignment
                        </p>
                    )}
                </div>

                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 shrink-0"
                    onClick={loadData}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Error state */}
            {error && (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 mb-6 shrink-0">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-destructive">Failed to load leads</p>
                        <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={loadData}
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                    </Button>
                </div>
            )}

            {/* Loading skeleton grid */}
            {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <CardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && leads.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        </div>
    );
}
