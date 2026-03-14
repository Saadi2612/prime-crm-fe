"use client";

import { useEffect, useState } from "react";
import { fetchTeamMember, type TeamMember } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, UserCircle2, Mail, ArrowLeft, RefreshCw, AlertTriangle, Phone, Target, CheckCircle2, Clock, XCircle, Contact } from "lucide-react";
import Link from "next/link";

// Avatar colors per name hash
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

export default function TeamMemberDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [member, setMember] = useState<TeamMember | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = () => {
        const id = params?.id as string;
        if (!id) return;
        setIsLoading(true);
        setError(null);
        fetchTeamMember(id)
            .then(setMember)
            .catch((e) => setError(e.message))
            .finally(() => setIsLoading(false));
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

    const stats = member.lead_stats ?? { total: 0, active: 0, won: 0, lost: 0 };

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
                            <span className="text-2xl font-bold tracking-tight text-foreground">{stats.won}</span>
                            <span className="text-xs font-medium text-muted-foreground uppercase">Qualified</span>
                        </div>

                        {/* Lost */}
                        <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center text-center space-y-1.5 shadow-sm">
                            <span className="p-2 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 mb-1">
                                <XCircle className="h-5 w-5" />
                            </span>
                            <span className="text-2xl font-bold tracking-tight text-foreground">{stats.lost}</span>
                            <span className="text-xs font-medium text-muted-foreground uppercase">Lost</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
