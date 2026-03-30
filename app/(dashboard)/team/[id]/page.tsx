"use client";

import { useEffect, useState } from "react";
import { fetchTeamMember, fetchLeads, type TeamMember } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Shield, UserCircle2, Mail, ArrowLeft, RefreshCw, AlertTriangle,
    Phone, Target, CheckCircle2, Clock, XCircle, Contact, Users,
    CalendarDays, Building2, DollarSign, StickyNote, ChevronRight,
    Tag
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, isPast, isToday, format } from "date-fns";
import type { Lead, StageRef, ProjectRef } from "@/types/leads";
import { formatBudget } from "@/lib/utils";

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-yellow-100 text-yellow-700",
    "bg-cyan-100 text-cyan-700",
];

function avatarColor(name: string) {
    if (!name) return AVATAR_COLORS[0];
    const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string) {
    if (!name || name.trim() === "") return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// ── Lead helpers ──────────────────────────────────────────────────────────────

function getStageName(stage: Lead["stage"]): string {
    if (!stage) return "—";
    if (typeof stage === "object") return (stage as StageRef).name;
    return stage;
}

function getProject(project: Lead["project"]): ProjectRef | null {
    if (!project) return null;
    if (typeof project === "object") return project as ProjectRef;
    return null;
}

// Stage badge colour map
const STAGE_COLORS: Record<string, string> = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "in progress": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    qualified: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    unqualified: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    contacted: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

function stageBadgeColor(name: string) {
    const key = name.toLowerCase();
    return STAGE_COLORS[key] ?? "bg-muted text-muted-foreground";
}

// ── Lead Card ─────────────────────────────────────────────────────────────────

function LeadCard({ lead }: { lead: Lead }) {
    const router = useRouter();
    const stageName = getStageName(lead.stage);
    const project = getProject(lead.project);
    const budget = formatBudget(lead.min_budget, lead.max_budget);

    const followUpDate = lead.latest_note?.next_follow_up ? new Date(lead.latest_note.next_follow_up) : null;
    const followUpOverdue = followUpDate && isPast(followUpDate) && !isToday(followUpDate);
    const followUpToday = followUpDate && isToday(followUpDate);

    return (
        <div
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-150 cursor-pointer group"
            onClick={() => router.push(`/leads/${lead.id}`)}
        >
            {/* Header row: avatar + name + stage */}
            <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(lead.full_name)}`}>
                    {initials(lead.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {lead.full_name}
                        </p>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${stageBadgeColor(stageName)}`}>
                            {stageName}
                        </span>
                    </div>
                    {lead.phone && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {lead.phone}
                        </p>
                    )}
                </div>
                {/* Navigate arrow */}
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 shrink-0 mt-1 transition-colors" />
            </div>

            {/* Detail rows */}
            <div className="mt-3 space-y-1.5">
                {/* Project */}
                {project && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                            <span className="font-medium text-foreground">{project.name}</span>
                            {project.type && (
                                <span className="ml-1 capitalize">· {project.type}</span>
                            )}
                        </span>
                    </div>
                )}

                {/* Budget */}
                {budget && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3 shrink-0" />
                        <span>Budget: <span className="font-medium text-foreground">{budget}</span></span>
                    </div>
                )}

                {/* Interest / property type */}
                {lead.property_interest && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3 shrink-0" />
                        <span className="capitalize">{lead.property_interest}</span>
                    </div>
                )}

                {/* Next follow-up */}
                {followUpDate && (
                    <div className={`flex items-center gap-2 text-xs ${
                        followUpOverdue
                            ? "text-red-600 dark:text-red-400"
                            : followUpToday
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                    }`}>
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <span>
                            Follow-up:{" "}
                            <span className="font-medium">
                                {followUpToday
                                    ? format(followUpDate, "'Today at' h:mm a")
                                    : format(followUpDate, "MMM d, yyyy h:mm a")
                                }
                            </span>
                            {followUpOverdue && " (overdue)"}
                        </span>
                    </div>
                )}

                {/* Latest note */}
                {lead.latest_note && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
                        <StickyNote className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                                {lead.latest_note.body}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(lead.latest_note.created_at), { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer: added date */}
            <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Added {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                </span>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamMemberDetailPage() {
    const params = useParams();
    const [member, setMember] = useState<TeamMember | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [leads, setLeads] = useState<Lead[]>([]);
    const [leadsLoading, setLeadsLoading] = useState(true);

    const loadData = () => {
        const id = params?.id as string;
        if (!id) return;
        setIsLoading(true);
        setError(null);
        fetchTeamMember(id)
            .then(setMember)
            .catch((e) => setError(e.message))
            .finally(() => setIsLoading(false));

        setLeadsLoading(true);
        fetchLeads({ assigned_to: id, is_paginated: false })
            .then(setLeads)
            .catch(() => setLeads([]))
            .finally(() => setLeadsLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [params?.id]);

    if (isLoading) {
        return (
            <div className="flex flex-col h-full max-w-5xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-32" />
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-14 w-14 rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-28" />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[0, 1].map((i) => (
                        <div key={i} className="rounded-2xl border border-border bg-card p-6 space-y-3">
                            <Skeleton className="h-4 w-28 mb-4" />
                            <Skeleton className="h-6 w-48" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !member) {
        return (
            <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
                <Button variant="ghost" size="sm" className="w-fit mb-4 gap-2 text-muted-foreground hover:text-foreground -ml-2" asChild>
                    <Link href="/team">
                        <ArrowLeft className="h-4 w-4" />
                        Back to team
                    </Link>
                </Button>
                <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 mt-4">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-destructive">Failed to load team member</p>
                        <p className="text-sm text-destructive/80 mt-0.5">{error || "User not found"}</p>
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
            </div>
        );
    }

    const stats = member.lead_stats ?? { total: 0, active: 0, qualified: 0, unqualified: 0 };

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full space-y-4">
            {/* ── Top bar ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
                    asChild
                >
                    <Link href="/team">
                        <ArrowLeft className="h-4 w-4" />
                        Back to team
                    </Link>
                </Button>
            </div>

            {/* ── Hero card ─────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="h-1 w-full bg-primary/20" />
                <div className="p-6 flex items-center gap-5">
                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${avatarColor(member.full_name)}`}>
                        {initials(member.full_name || member.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">{member.full_name || "Unnamed User"}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5 capitalize flex items-center gap-1.5">
                            {member.role === 'admin' && <Shield className="h-3.5 w-3.5 text-red-500" />}
                            {member.role === 'manager' && <Shield className="h-3.5 w-3.5 text-blue-500" />}
                            {member.role === 'agent' && <UserCircle2 className="h-3.5 w-3.5 text-green-500" />}
                            {member.role}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Info grid ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact Info */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Contact className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Contact Info
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-foreground">
                                <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                </span>
                                <span>{member.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-foreground">
                                <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                </span>
                                <span>{member.phone_number || "Not provided"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lead Stats */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Overall Leads Stats
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Total Leads */}
                        <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center text-center space-y-1.5 shadow-sm">
                            <span className="p-2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 mb-1">
                                <Target className="h-5 w-5" />
                            </span>
                            <span className="text-2xl font-bold tracking-tight text-foreground">{stats.total}</span>
                            <span className="text-xs font-medium text-muted-foreground uppercase">Total</span>
                        </div>

                        {/* In Progress */}
                        <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center text-center space-y-1.5 shadow-sm">
                            <span className="p-2 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 mb-1">
                                <Clock className="h-5 w-5" />
                            </span>
                            <span className="text-2xl font-bold tracking-tight text-foreground">{stats.active}</span>
                            <span className="text-xs font-medium text-muted-foreground uppercase">In Progress</span>
                        </div>

                        {/* Qualified */}
                        <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center text-center space-y-1.5 shadow-sm">
                            <span className="p-2 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 mb-1">
                                <CheckCircle2 className="h-5 w-5" />
                            </span>
                            <span className="text-2xl font-bold tracking-tight text-foreground">{stats.qualified}</span>
                            <span className="text-xs font-medium text-muted-foreground uppercase">Qualified</span>
                        </div>

                        {/* Unqualified */}
                        <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center text-center space-y-1.5 shadow-sm">
                            <span className="p-2 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 mb-1">
                                <XCircle className="h-5 w-5" />
                            </span>
                            <span className="text-2xl font-bold tracking-tight text-foreground">{stats.unqualified}</span>
                            <span className="text-xs font-medium text-muted-foreground uppercase">Unqualified</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Assigned Leads ─────────────────────────────────────────── */}
            <div className="space-y-4 pb-6">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Assigned Leads
                    </p>
                    {!leadsLoading && leads.length > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {leads.length} lead{leads.length !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {leadsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <Skeleton className="h-4 w-36" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-12 w-full rounded-lg" />
                            </div>
                        ))}
                    </div>
                ) : leads.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center justify-center text-center gap-3">
                        <span className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-6 w-6 text-muted-foreground" />
                        </span>
                        <div>
                            <p className="text-sm font-medium text-foreground">No leads assigned</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {member.full_name || "This team member"} has no leads assigned yet.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {leads.map((lead) => (
                            <LeadCard key={lead.id} lead={lead} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
