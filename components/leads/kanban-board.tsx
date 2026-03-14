"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, AlertTriangle, LayoutGrid, List, LogIn, Plus, RefreshCw, Search, ExternalLink, Mail, Phone, FileText, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import type { Lead, Stage } from "@/types/leads";
import { fetchLeads, fetchStages, updateLeadStage } from "@/lib/api";
import { toast } from "sonner";
import { AddLeadDialog } from "@/components/leads/add-lead-dialog";
import { LeadsStatsCards } from "@/components/leads/leads-stats-cards";
import { LeadCard } from "@/components/leads/lead-card";

import {
    Kanban,
    KanbanBoard,
    KanbanColumn,
    KanbanColumnHandle,
    KanbanItem,
    KanbanOverlay,
} from "@/components/ui/kanban";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import Link from "next/link";
import { formatBudget } from "@/lib/utils";

type ViewMode = "kanban" | "list";

// Stage color dot mapping
const STAGE_DOT: Record<string, string> = {
    new: "bg-gray-400",
    contacted: "bg-orange-400",
    negotiation: "bg-orange-500",
    qualified: "bg-green-500",
    lost: "bg-gray-300",
};

// Column background tint mapping
// const STAGE_BG: Record<string, string> = {
//     new: "bg-slate-50",
//     contacted: "bg-amber-50",
//     negotiation: "bg-orange-50",
//     qualified: "bg-green-50",
//     lost: "bg-gray-50",
// };
const STAGE_BG: Record<string, string> = {
    new: "bg-slate-50",
    contacted: "bg-slate-50",
    negotiation: "bg-slate-50",
    qualified: "bg-slate-50",
    lost: "bg-slate-50",
};

// Avatar colours per name hash
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
    const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

/** Extract a plain stage ID regardless of whether the API returned a nested object or a string */
function stageId(stage: Lead["stage"] | undefined | null): string | undefined {
    if (!stage) return undefined;
    if (typeof stage === "object") return stage.id;
    return stage;
}

export function KanbanBoardView() {
    const router = useRouter();
    const dragRef = useRef(false);

    // ── Data state ────────────────────────────────────────────────────────────
    const [stages, setStages] = useState<Stage[]>([]);
    const [columns, setColumns] = useState<Record<string, Lead[]>>({});
    const [stagesLoading, setStagesLoading] = useState(true);
    const [leadsLoading, setLeadsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [stageFilter, setStageFilter] = useState("all");
    const [viewMode, setViewMode] = useState<ViewMode>("kanban");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [defaultStageId, setDefaultStageId] = useState<string | undefined>();

    // ── Fetch stages ──────────────────────────────────────────────────────────
    useEffect(() => {
        fetchStages()
            .then((data) => {
                const sorted = [...data].sort((a, b) => a.order - b.order);
                setStages(sorted);
            })
            .catch((e) => setError(e.message))
            .finally(() => setStagesLoading(false));
    }, []);

    // ── Fetch leads → build column map ────────────────────────────────────────
    const loadLeads = useCallback(() => {
        setLeadsLoading(true);
        fetchLeads({
            stage: stageFilter !== "all" ? stageFilter : undefined,
            search: search || undefined,
        })
            .then((leads) => {
                const map: Record<string, Lead[]> = {};
                stages.forEach((s) => { map[s.id] = []; });
                leads.forEach((l) => {
                    const sid = stageId(l.stage);
                    if (sid && map[sid] !== undefined) {
                        map[sid].push(l);
                    }
                });
                setColumns(map);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLeadsLoading(false));
    }, [stages, stageFilter, search]);

    useEffect(() => {
        if (stages.length > 0) loadLeads();
    }, [loadLeads, stages]);

    // ── DiceUI kanban value-change → persist new stage ────────────────────────
    async function handleColumnsChange(next: Record<string, Lead[]>) {
        const prev = columns;
        setColumns(next); // optimistic update

        // Find which lead moved to a new column
        for (const [stageId, leads] of Object.entries(next)) {
            for (const lead of leads) {
                const previousStage = Object.entries(prev).find(([, ls]) =>
                    ls.some((l) => l.id === lead.id)
                )?.[0];
                if (previousStage && previousStage !== stageId) {
                    try {
                        await updateLeadStage(lead.id, stageId);
                    } catch {
                        // Revert on failure
                        setColumns(prev);
                        setError("Failed to move lead. Please try again.");
                    }
                    return; // Only one move per drag event
                }
            }
        }
    }

    function openAddLead(stageId?: string) {
        setDefaultStageId(stageId);
        setDialogOpen(true);
    }

    function handleLeadCreated(newLead: Lead) {
        const sid = stageId(newLead.stage);
        if (sid) {
            setColumns((prev) => ({
                ...prev,
                [sid]: [newLead, ...(prev[sid] ?? [])],
            }));
        }
        loadLeads();
    }

    const totalLeads = Object.values(columns).flat().length;
    const allLeads = Object.values(columns).flat();

    return (
        <>
            <AddLeadDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                defaultStageId={defaultStageId}
                onSuccess={handleLeadCreated}
            />

            <div className="flex flex-col w-full h-full min-w-0">
                {/* ── Page Header ─────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
                        {leadsLoading ? (
                            <Skeleton className="h-4 w-28 mt-1" />
                        ) : (
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {totalLeads} lead{totalLeads !== 1 ? "s" : ""} found
                            </p>
                        )}
                    </div>
                    <Button size="sm" className="gap-2 shrink-0" onClick={() => openAddLead()}>
                        <Plus className="h-4 w-4" />
                        Add Lead
                    </Button>
                </div>

                {/* ── Stats Cards ─────────────────────────────────────────────────── */}
                <LeadsStatsCards />

                {/* ── Toolbar ─────────────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="relative flex-1 max-w-72">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search leads..."
                            className="pl-9 h-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select value={stageFilter} onValueChange={setStageFilter}>
                        <SelectTrigger className="h-9 w-[140px]">
                            <SelectValue placeholder="All Stages" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stages</SelectItem>
                            {stages.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                    <span className="capitalize">{s.name}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center border border-border rounded-md">
                        <Button
                            variant={viewMode === "kanban" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-9 w-9 rounded-r-none border-0"
                            onClick={() => setViewMode("kanban")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-9 w-9 rounded-l-none border-0"
                            onClick={() => setViewMode("list")}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* ── Error banner ─────────────────────────────────────────────────── */}
                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 mb-4">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-destructive">Something went wrong</p>
                            <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {error.toLowerCase().includes("session") || error.toLowerCase().includes("log in") ? (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1.5 h-8 text-xs"
                                    onClick={() => router.push("/login")}
                                >
                                    <LogIn className="h-3.5 w-3.5" />
                                    Log in again
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                                    onClick={() => { setError(null); loadLeads(); }}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Retry
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Kanban View ──────────────────────────────────────────────────── */}
                {viewMode === "kanban" && (
                    stagesLoading ? (
                        <div className="flex gap-4 overflow-x-auto pb-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="min-w-[240px] w-[360px] shrink-0">
                                    <Skeleton className="h-7 w-28 mb-3" />
                                    <Skeleton className="h-[380px] w-full rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto pb-4 flex-1">
                            <Kanban
                                value={columns}
                                onValueChange={handleColumnsChange}
                                getItemValue={(item: Lead) => item.id}
                            >
                                <KanbanBoard className="flex gap-4 items-start">
                                    {stages.map((stage) => {
                                        const stageName = stage.name.toLowerCase();
                                        const leads = columns[stage.id] ?? [];
                                        const dotColor = STAGE_DOT[stageName] ?? "bg-primary";
                                        const colBg = STAGE_BG[stageName] ?? "bg-muted/30";

                                        return (
                                            <KanbanColumn
                                                key={stage.id}
                                                value={stage.id}
                                                className={`flex flex-col min-w-[240px] w-[360px] shrink-0 rounded-xl border border-border/40 p-2 gap-2 ${colBg}`}
                                            >
                                                {/* Column header */}
                                                <div className="flex items-center justify-between px-1 py-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
                                                        <span className="text-sm font-semibold capitalize">
                                                            {stage.name}
                                                        </span>
                                                        <Badge
                                                            variant="secondary"
                                                            className="h-5 min-w-5 rounded-full px-1.5 text-xs font-medium pointer-events-none"
                                                        >
                                                            {leadsLoading ? "…" : leads.length}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {/* <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                            onClick={() => openAddLead(stage.id)}
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </Button> */}
                                                        <KanbanColumnHandle asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground cursor-grab">
                                                                <GripVertical className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </KanbanColumnHandle>
                                                    </div>
                                                </div>

                                                {/* Lead cards */}
                                                <div className="flex flex-col gap-2 min-h-[320px]">
                                                    {leadsLoading ? (
                                                        <>
                                                            <Skeleton className="h-[60px] w-full rounded-lg" />
                                                            <Skeleton className="h-[60px] w-full rounded-lg" />
                                                        </>
                                                    ) : (
                                                        leads.map((lead) => (
                                                            <KanbanItem
                                                                key={lead.id}
                                                                value={lead.id}
                                                                asHandle
                                                                asChild
                                                            >
                                                                <div
                                                                    className="group rounded-lg border border-border bg-card p-3 shadow-xs cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                                                                    onMouseDown={() => { dragRef.current = false; }}
                                                                    onMouseMove={() => { dragRef.current = true; }}
                                                                    onMouseUp={() => {
                                                                        if (!dragRef.current) {
                                                                            router.push(`/leads/${lead.id}`);
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <Avatar className="h-7 w-7 shrink-0">
                                                                                <AvatarFallback
                                                                                    className={`text-xs font-medium ${avatarColor(lead.full_name ?? "")}`}
                                                                                >
                                                                                    {initials(lead.full_name ?? "?")}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-sm font-medium text-foreground truncate flex-1">
                                                                                {lead.full_name}
                                                                            </span>
                                                                        </div>
                                                                        {lead.latest_note && (
                                                                            <HoverCard openDelay={200} closeDelay={100}>
                                                                                <HoverCardTrigger asChild>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-6 w-6 text-muted-foreground hover:text-foreground ml-auto cursor-pointer"
                                                                                        tabIndex={-1}
                                                                                        onPointerDown={(e) => e.stopPropagation()}
                                                                                        onMouseDown={(e) => { e.stopPropagation() }}
                                                                                    >
                                                                                        <FileText className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                </HoverCardTrigger>
                                                                                <HoverCardContent
                                                                                    align="end"
                                                                                    className="w-64 p-3 z-50 shadow-md"
                                                                                    onPointerDown={(e) => e.stopPropagation()}
                                                                                    onMouseDown={(e) => { e.stopPropagation() }}
                                                                                >
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed text-left">
                                                                                            {lead.latest_note.body}
                                                                                        </p>
                                                                                        <p className="text-[11px] text-muted-foreground text-left">
                                                                                            Added {formatDistanceToNow(new Date(lead.latest_note.created_at), { addSuffix: true })}
                                                                                        </p>
                                                                                    </div>
                                                                                </HoverCardContent>
                                                                            </HoverCard>
                                                                        )}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                                                                            tabIndex={-1}
                                                                            onPointerDown={(e) => e.stopPropagation()}
                                                                            onMouseDown={(e) => { e.stopPropagation() }}
                                                                            onClick={(e) => { e.stopPropagation(); router.push(`/leads/${lead.id}`); }}
                                                                        >
                                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                    {lead.email && (
                                                                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                            <Mail className="h-3 w-3 shrink-0" />
                                                                            <span className="truncate">{lead.email}</span>
                                                                        </div>
                                                                    )}
                                                                    {lead.phone && (
                                                                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                            <Phone className="h-3 w-3 shrink-0" />
                                                                            <span className="truncate">{lead.phone}</span>
                                                                        </div>
                                                                    )}

                                                                    {(lead.min_budget || lead.max_budget) && (
                                                                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                            <DollarSign className="h-3 w-3 shrink-0" />
                                                                            <span>
                                                                                {lead.min_budget && lead.max_budget
                                                                                    ? `${formatBudget(lead.min_budget, lead.max_budget)}`
                                                                                    : lead.max_budget
                                                                                        ? `Up to ${formatBudget(lead.max_budget)}`
                                                                                        : `From ${formatBudget(lead.min_budget!)}`}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                                                        {/* Associated project */}
                                                                        <Link href={`/projects/${lead.project?.id}`} className="truncate hover:underline" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                                                            {lead.project?.name ?? "-"}
                                                                        </Link>
                                                                        {/* Assignee */}
                                                                        {lead.assigned_to
                                                                            ? (() => {
                                                                                const name = typeof lead.assigned_to === "object" && "full_name" in (lead.assigned_to as object)
                                                                                    ? (lead.assigned_to as { full_name: string }).full_name
                                                                                    : String(lead.assigned_to);
                                                                                return (
                                                                                    <Avatar className="h-5 w-5 shrink-0" title={name}>
                                                                                        <AvatarFallback className={`text-[9px] font-semibold ${avatarColor(name)}`}>
                                                                                            {initials(name)}
                                                                                        </AvatarFallback>
                                                                                    </Avatar>
                                                                                );
                                                                            })()
                                                                            : <span className="shrink-0 text-muted-foreground/50">–</span>
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </KanbanItem>
                                                        ))
                                                    )}

                                                    {/* Empty state add button */}
                                                    {!leadsLoading && leads.length === 0 && stage.name === 'new' && (
                                                        <button
                                                            onClick={() => openAddLead(stage.id)}
                                                            className="flex items-center gap-1.5 w-full rounded-lg px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                            Add lead
                                                        </button>
                                                    )}
                                                </div>
                                            </KanbanColumn>
                                        );
                                    })}
                                </KanbanBoard>

                                {/* Drag overlay */}
                                <KanbanOverlay>
                                    <div className="h-full rounded-lg border-2 border-dashed border-primary/40 bg-primary/5" />
                                </KanbanOverlay>
                            </Kanban>
                        </div>
                    )
                )}

                {/* ── List View ────────────────────────────────────────────────────── */}
                {viewMode === "list" && (
                    <div className="rounded-xl border border-border bg-card">
                        <div className="divide-y divide-border">
                            {leadsLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-4">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-40" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                ))
                            ) : allLeads.length === 0 ? (
                                <div className="py-16 text-center">
                                    <p className="text-muted-foreground text-sm">No leads found</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-3 gap-2"
                                        onClick={() => openAddLead()}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add your first lead
                                    </Button>
                                </div>
                            ) : (
                                allLeads.map((lead) => {
                                    const stage = stages.find((s) => s.id === stageId(lead.stage));
                                    return (
                                        <div
                                            key={lead.id}
                                            onClick={() => router.push(`/leads/${lead.id}`)}
                                            className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarFallback className={`text-xs font-semibold ${avatarColor(lead.full_name ?? "")}`}>
                                                        {initials(lead.full_name ?? "?")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="text-sm font-medium">{lead.full_name}</div>
                                                    {lead.latest_note && (
                                                        <div className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                                                            {lead.latest_note.body}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {stage && (
                                                <span className="text-xs capitalize text-muted-foreground border border-border rounded-full px-2.5 py-0.5 shrink-0">
                                                    {stage.name}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
