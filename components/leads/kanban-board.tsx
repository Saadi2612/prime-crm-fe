"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    GripVertical, AlertTriangle, LayoutGrid, List, LogIn,
    Plus, RefreshCw, Search, ExternalLink,
    FileText, Loader2, User, Users, Download, Clock, Megaphone,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import type { Lead, Stage } from "@/types/leads";
import type { TeamMember } from "@/lib/api";
import { fetchLeads, fetchLeadsPaginated, fetchStages, updateLeadStage, fetchTeamMembers, transferLead } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { AddLeadDialog } from "@/components/leads/add-lead-dialog";
import { ExportLeadsDialog } from "@/components/leads/export-leads-dialog";
import { LeadsStatsCards } from "@/components/leads/leads-stats-cards";
// import { LeadCard } from "@/components/leads/lead-card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
    Kanban,
    KanbanBoard,
    KanbanColumn,
    KanbanColumnHandle,
    KanbanItem,
    KanbanOverlay,
} from "@/components/ui/kanban";
// import { Badge } from "@/components/ui/badge";
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
// import { formatBudget } from "@/lib/utils";

type ViewMode = "kanban" | "list";

const PAGE_SIZE = 20;

type ColState = {
    leads: Lead[];
    page: number;
    hasMore: boolean;
    loading: boolean;
};

// Stitch-exact stage accent colors (top bar + badge)
const STAGE_ACCENT: Record<string, string> = {
    new:         "#0EA5E9",
    contacted:   "#6366F1",
    negotiation: "#06B6D4",
    pipeline:    "#06B6D4",
    qualified:   "#10B981",
    lost:        "#F43F5E",
    unqualified: "#F43F5E",
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

function LeadAssigner({ lead, teamMembers, onAssigned }: { lead: Lead, teamMembers: TeamMember[], onAssigned: () => void }) {
    const [search, setSearch] = useState("");
    const [assigningTo, setAssigningTo] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const filtered = teamMembers.filter((m) =>
        m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
    );

    async function handleAssign(member: TeamMember) {
        setAssigningTo(member.id);
        try {
            await transferLead(lead.id, member.id, "Assigned from Kanban");
            toast.success(`Assigned to ${member.full_name}`);
            setOpen(false);
            onAssigned();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to assign lead");
        } finally {
            setAssigningTo(null);
        }
    }

    const assignedToDisplay = lead.assigned_to
        ? (typeof lead.assigned_to === "object" && "full_name" in (lead.assigned_to as object) ? (lead.assigned_to as { full_name: string }).full_name : String(lead.assigned_to))
        : null;

    return (
        <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
            <DropdownMenuTrigger asChild>
                <button
                    className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
                    title={assignedToDisplay || "Assign to user"}
                    aria-label="Assign lead to a user"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {assignedToDisplay ? (
                        <Avatar className="h-5 w-5 shrink-0">
                            <AvatarFallback className={`text-[9px] font-semibold ${avatarColor(assignedToDisplay)}`}>
                                {initials(assignedToDisplay)}
                            </AvatarFallback>
                        </Avatar>
                    ) : (
                        <div className="h-5 w-5 rounded-full bg-muted border border-dashed border-muted-foreground/40 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5">
                            <User className="h-3 w-3" />
                        </div>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-0" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <div className="p-2 pb-1.5">
                    <DropdownMenuLabel className="px-1 py-0 pb-2 text-xs font-semibold">
                        Assign to
                    </DropdownMenuLabel>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search..."
                            className="h-8 pl-8 text-xs"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                </div>
                <DropdownMenuSeparator className="my-0" />
                <div className="max-h-52 overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                            No users found
                        </p>
                    ) : (
                        filtered.map((member) => (
                            <DropdownMenuItem
                                key={member.id}
                                className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer"
                                onSelect={(e) => {
                                    e.preventDefault();
                                    handleAssign(member);
                                }}
                                disabled={assigningTo !== null}
                            >
                                <Avatar className="h-7 w-7 shrink-0">
                                    <AvatarFallback className={`text-[10px] font-semibold ${avatarColor(member.full_name)}`}>
                                        {initials(member.full_name || member.email)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-foreground truncate">
                                        {member.full_name || member.email}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground capitalize">
                                        {member.role}
                                    </p>
                                </div>
                                {assigningTo === member.id && (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const KanbanLeadCard = memo(function KanbanLeadCard({
    lead,
    stageName,
    teamMembers,
    onAssigned,
    dragRef,
    onNavigate,
}: {
    lead: Lead;
    stageName: string;
    teamMembers: TeamMember[];
    onAssigned: () => void;
    dragRef: { current: boolean };
    onNavigate: (id: string) => void;
}) {
    const receivedRaw = lead.created_time ?? lead.created_at;
    const receivedAt = receivedRaw
        ? formatDistanceToNow(new Date(receivedRaw), { addSuffix: true })
        : null;

    // Meta ad context — shown when no project is linked
    const adLabel =
        !lead.project && (lead.ad_name || lead.ad_id)
            ? `Ad: ${lead.ad_name || lead.ad_id}`
            : null;

    return (
        <div
            data-testid="lead-card"
            data-lead-id={lead.id}
            data-lead-name={lead.full_name}
            className={`group bg-white p-4 rounded-xl shadow-sm border border-transparent hover:border-blue-500/20 hover:shadow-md transition-all ${stageName === "lost" || stageName === "unqualified" ? "opacity-60 grayscale hover:grayscale-0 hover:opacity-100" : ""}`}
            onMouseDown={() => { dragRef.current = false; }}
            onMouseUp={() => { if (!dragRef.current) onNavigate(lead.id); }}
        >
            <div className="flex items-center justify-between mb-3">
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={`text-xs font-bold ${avatarColor(lead.full_name ?? "")}`}>
                        {initials(lead.full_name ?? "?")}
                    </AvatarFallback>
                </Avatar>
                <LeadAssigner lead={lead} teamMembers={teamMembers} onAssigned={onAssigned} />
            </div>

            <h4 className="font-bold text-sm text-slate-900 mb-1 leading-snug">{lead.full_name}</h4>

            {lead.phone && (
                <p className="text-slate-500 text-xs mb-1.5 font-mono">{lead.phone}</p>
            )}

            {receivedAt && (
                <p
                    className="flex items-center gap-1 text-slate-400 text-[11px] mb-3"
                    title={new Date(receivedRaw as string).toLocaleString()}
                >
                    <Clock className="h-3 w-3 shrink-0" />
                    Received {receivedAt}
                </p>
            )}

            {adLabel && (
                <p
                    className="flex items-center gap-1.5 text-slate-500 text-[11px] leading-snug mb-3"
                    title={adLabel}
                >
                    <Megaphone className="h-3 w-3 shrink-0 text-slate-400" />
                    <span className="truncate">{adLabel}</span>
                </p>
            )}

            <div className="flex flex-wrap gap-1.5">
                {lead.is_queued && (
                    <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter"
                        style={{ color: "#B45309", backgroundColor: "#FEF3C7" }}
                        title="Queued for distribution at next office open"
                    >
                        Queued
                    </span>
                )}
                {lead.project?.name && (
                    <Link
                        href={`/projects/${lead.project.id}`}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="inline-block bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-slate-200 transition-colors"
                    >
                        {lead.project.name}
                    </Link>
                )}
            </div>

            <div className="flex items-center justify-between mt-1.5">
                {lead.latest_note ? (
                    <HoverCard openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-slate-400 hover:text-slate-700 -ml-1 cursor-default"
                                tabIndex={-1}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onMouseUp={(e) => e.stopPropagation()}
                            >
                                <FileText className="h-3 w-3" />
                            </Button>
                        </HoverCardTrigger>
                        <HoverCardContent
                            align="start"
                            className="w-64 p-3 z-50 shadow-md"
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
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
                ) : <span />}
                <Link
                    href={`/leads/${lead.id}`}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    className="flex items-center justify-center h-7 w-7 -mr-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                    title="Open lead detail"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    );
});

export function KanbanBoardView() {
    const router = useRouter();
    const { user } = useAuth();
    const [exportOpen, setExportOpen] = useState(false);
    const dragRef = useRef(false);
    const dragSourceRef = useRef<{ leadId: string; fromColumnId: string; snapshot: Record<string, Lead[]> } | null>(null);
    const columnsRef = useRef<Record<string, Lead[]>>({});

    // ── Data state ────────────────────────────────────────────────────────────
    const [stages, setStages] = useState<Stage[]>([]);
    const [colStates, setColStates] = useState<Record<string, ColState>>({});
    const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [listLeads, setListLeads] = useState<Lead[] | null>(null);
    const [listLoading, setListLoading] = useState(false);

    // Derive flat columns for dnd-kit from per-column state
    const columns = useMemo(
        () => Object.fromEntries(Object.entries(colStates).map(([k, v]) => [k, v.leads])),
        [colStates]
    );

    useEffect(() => { columnsRef.current = columns; }, [columns]);

    const handleNavigate = useCallback((id: string) => {
        router.push(`/leads/${id}`);
    }, [router]);

    const [stagesLoading, setStagesLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [stageFilter, setStageFilter] = useState("all");

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);
    const [viewMode, setViewMode] = useState<ViewMode>("kanban");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [defaultStageId, setDefaultStageId] = useState<string | undefined>();

    // ── Fetch stages + team members ───────────────────────────────────────────
    useEffect(() => {
        Promise.all([fetchStages(), fetchTeamMembers()])
            .then(([stagesData, teamData]) => {
                const sorted = [...stagesData].sort((a, b) => a.order - b.order);
                setStages(sorted);
                setTeamMembers(teamData);
            })
            .catch((e) => setError(e.message))
            .finally(() => setStagesLoading(false));
    }, []);

    // ── Per-column paginated fetch (page 1 on filter/search change) ───────────
    useEffect(() => {
        if (stages.length === 0) return;
        let cancelled = false;

        const stagesToLoad = stageFilter !== "all"
            ? stages.filter(s => s.id === stageFilter)
            : stages;

        (async () => {
            await Promise.resolve(); // yield to React before any setState
            if (cancelled) return;

            setColStates(() => {
                const next: Record<string, ColState> = {};
                stages.forEach(s => {
                    const isLoading = stagesToLoad.some(sl => sl.id === s.id);
                    next[s.id] = { leads: [], page: 1, hasMore: isLoading, loading: isLoading };
                });
                return next;
            });
            setStageCounts({});

            await Promise.all(stagesToLoad.map(async (stage) => {
                if (cancelled) return;
                try {
                    const data = await fetchLeadsPaginated({
                        stage: stage.id,
                        page: 1,
                        page_size: PAGE_SIZE,
                        search: debouncedSearch || undefined,
                    });
                    if (cancelled) return;
                    setColStates(prev => ({
                        ...prev,
                        [stage.id]: { leads: data.results, page: 1, hasMore: data.next !== null, loading: false },
                    }));
                    setStageCounts(prev => ({ ...prev, [stage.id]: data.count }));
                } catch (e) {
                    if (cancelled) return;
                    setColStates(prev => ({
                        ...prev,
                        [stage.id]: { leads: [], page: 1, hasMore: false, loading: false },
                    }));
                    setError(e instanceof Error ? e.message : String(e));
                }
            }));
        })();

        return () => { cancelled = true; };
    }, [stages, stageFilter, debouncedSearch]);

    // ── List view: fetch all leads only when list is active ───────────────────
    useEffect(() => {
        if (viewMode !== "list") return;
        let cancelled = false;
        (async () => {
            await Promise.resolve(); // yield to React before any setState
            if (cancelled) return;
            setListLoading(true);
            setListLeads(null);
            try {
                const leads = await fetchLeads({
                    is_paginated: false,
                    stage: stageFilter !== "all" ? stageFilter : undefined,
                    search: debouncedSearch || undefined,
                });
                if (!cancelled) setListLeads(leads);
            } catch (e) {
                if (!cancelled) setError((e as Error).message);
            } finally {
                if (!cancelled) setListLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [viewMode, stageFilter, debouncedSearch]);

    // ── Load next page for a single column ────────────────────────────────────
    const loadMore = useCallback(async (stageId: string) => {
        const col = colStates[stageId];
        if (!col || col.loading || !col.hasMore) return;

        const nextPage = col.page + 1;
        setColStates(prev => ({ ...prev, [stageId]: { ...prev[stageId], loading: true } }));
        try {
            const data = await fetchLeadsPaginated({
                stage: stageId,
                page: nextPage,
                page_size: PAGE_SIZE,
                search: debouncedSearch || undefined,
            });
            setColStates(prev => ({
                ...prev,
                [stageId]: {
                    leads: [...(prev[stageId]?.leads ?? []), ...data.results],
                    page: nextPage,
                    hasMore: data.next !== null,
                    loading: false,
                },
            }));
            setStageCounts(prev => ({ ...prev, [stageId]: data.count }));
        } catch (e) {
            setColStates(prev => ({ ...prev, [stageId]: { ...prev[stageId], loading: false } }));
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [colStates, debouncedSearch]);

    // ── Manual refresh (after assign / create) ────────────────────────────────
    const loadLeads = useCallback(() => {
        const stagesToLoad = stageFilter !== "all"
            ? stages.filter(s => s.id === stageFilter)
            : stages;
        stagesToLoad.forEach(async (stage) => {
            setColStates(prev => ({
                ...prev,
                [stage.id]: { ...(prev[stage.id] ?? { leads: [], hasMore: true }), page: 1, loading: true },
            }));
            try {
                const data = await fetchLeadsPaginated({
                    stage: stage.id, page: 1, page_size: PAGE_SIZE, search: debouncedSearch || undefined,
                });
                setColStates(prev => ({
                    ...prev,
                    [stage.id]: { leads: data.results, page: 1, hasMore: data.next !== null, loading: false },
                }));
                setStageCounts(prev => ({ ...prev, [stage.id]: data.count }));
            } catch {
                setColStates(prev => ({
                    ...prev,
                    [stage.id]: { ...(prev[stage.id] ?? { leads: [], hasMore: false }), loading: false },
                }));
            }
        });
    }, [stages, stageFilter, debouncedSearch]);

    // ── Visual-only update during drag — no API ───────────────────────────────
    const handleColumnsChange = useCallback((next: Record<string, Lead[]>) => {
        setColStates(prev => {
            const updated = { ...prev };
            for (const [sid, leads] of Object.entries(next)) {
                updated[sid] = { ...(prev[sid] ?? { page: 1, hasMore: false, loading: false }), leads };
            }
            return updated;
        });
    }, []);

    // ── Capture source column when drag starts ────────────────────────────────
    const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
        const leadId = String(event.active.id);
        const cols = columnsRef.current;
        const entry = Object.entries(cols).find(([, leads]) =>
            leads.some((l) => l.id === leadId)
        );
        if (entry) {
            dragSourceRef.current = { leadId, fromColumnId: entry[0], snapshot: cols };
        }
    }, []);

    // ── API call only on actual drop to different column ──────────────────────
    const handleDragEnd = useCallback(async () => {
        const src = dragSourceRef.current;
        dragSourceRef.current = null;
        if (!src) return;

        const cols = columnsRef.current;
        const destEntry = Object.entries(cols).find(([, leads]) =>
            leads.some((l) => l.id === src.leadId)
        );
        if (destEntry && destEntry[0] !== src.fromColumnId) {
            try {
                await updateLeadStage(src.leadId, destEntry[0]);
            } catch {
                setColStates(prev => {
                    const updated = { ...prev };
                    for (const [sid, leads] of Object.entries(src.snapshot)) {
                        updated[sid] = { ...(prev[sid] ?? { page: 1, hasMore: false, loading: false }), leads };
                    }
                    return updated;
                });
                setError("Failed to move lead. Please try again.");
            }
        }
    }, []);

    function openAddLead(sid?: string) {
        setDefaultStageId(sid);
        setDialogOpen(true);
    }

    function handleLeadCreated(newLead: Lead) {
        const sid = stageId(newLead.stage);
        if (sid) {
            setColStates(prev => ({
                ...prev,
                [sid]: {
                    ...(prev[sid] ?? { page: 1, hasMore: true, loading: false }),
                    leads: [newLead, ...(prev[sid]?.leads ?? [])],
                },
            }));
            setStageCounts(prev => ({ ...prev, [sid]: (prev[sid] ?? 0) + 1 }));
        }
        loadLeads();
    }

    const totalLeads = stageFilter === "all"
        ? Object.values(stageCounts).reduce((a, b) => a + b, 0)
        : (stageCounts[stageFilter] ?? 0);
    const anyLoading = Object.values(colStates).some(c => c.loading);

    return (
        <>
            <AddLeadDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                defaultStageId={defaultStageId}
                onSuccess={handleLeadCreated}
            />

            <div className="flex flex-col w-full h-full min-w-0">

                {/* ── Page Header ──────────────────────────────────────────────── */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <Users className="h-6 w-6" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                        </div>
                        <p className="text-slate-500 font-medium mt-1 text-sm ml-14">
                            {anyLoading
                                ? "Loading..."
                                : `${totalLeads} leads found in the current pipeline.`}
                        </p>
                    </div>

                    {/* Right-side toolbar inline with title */}
                    <div className="flex items-center gap-3 shrink-0">
                        {/* All-stages filter button */}
                        <Select value={stageFilter} onValueChange={setStageFilter}>
                            <SelectTrigger className="h-9 w-auto gap-2 border border-slate-200 bg-white text-slate-600 font-semibold text-sm rounded-lg px-3">
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

                        {/* Add lead — the primary write entry point */}
                        <Button
                            size="sm"
                            className="h-9 gap-2 shrink-0"
                            data-testid="add-lead-button"
                            onClick={() => openAddLead(stageFilter === "all" ? undefined : stageFilter)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Lead
                        </Button>

                        {/* View-mode toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-lg gap-0.5">
                            <button
                                onClick={() => setViewMode("kanban")}
                                className={`p-2 rounded transition-all ${
                                    viewMode === "kanban"
                                        ? "bg-white shadow-sm text-blue-600"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                                aria-label="Kanban view"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded transition-all ${
                                    viewMode === "list"
                                        ? "bg-white shadow-sm text-blue-600"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                                aria-label="List view"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Stats Cards ──────────────────────────────────────────────── */}
                <LeadsStatsCards />

                {/* ── Search bar (below stats, above kanban) ───────────────────── */}
                <div className="flex items-center justify-between gap-3 mb-8">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            data-testid="leads-search"
                            placeholder="Search leads..."
                            className="w-full h-9 pl-9 pr-3 bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#2563EB] transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {user?.role === "admin" && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-2 border-[#E2E8F0] shrink-0"
                            onClick={() => setExportOpen(true)}
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export
                        </Button>
                    )}
                </div>

                {user?.role === "admin" && (
                    <ExportLeadsDialog
                        open={exportOpen}
                        onOpenChange={setExportOpen}
                        stages={stages}
                    />
                )}

                {/* ── Error banner ──────────────────────────────────────────────── */}
                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 mb-6">
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

                {/* ── Kanban View ───────────────────────────────────────────────── */}
                {viewMode === "kanban" && (
                    stagesLoading ? (
                        <div className="flex gap-5 overflow-x-auto pb-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="min-w-[220px] shrink-0">
                                    <Skeleton className="h-6 w-24 mb-3 rounded-full" />
                                    <Skeleton className="h-[380px] w-full rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto pb-6 flex-1">
                            <Kanban
                                value={columns}
                                onValueChange={handleColumnsChange}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                getItemValue={(item: Lead) => item.id}
                            >
                                <KanbanBoard className="flex gap-5 items-start">
                                    {stages.map((stage) => {
                                        const stageName = stage.name.toLowerCase();
                                        const leads = columns[stage.id] ?? [];
                                        const col = colStates[stage.id];
                                        const isInitialLoading = !col || (col.loading && col.leads.length === 0);
                                        const accent = STAGE_ACCENT[stageName] ?? "#94A3B8";
                                        const displayCount = stageCounts[stage.id] ?? leads.length;
                                        const remaining = displayCount - leads.length;

                                        return (
                                            <KanbanColumn
                                                key={stage.id}
                                                value={stage.id}
                                                className="flex flex-col min-w-[200px] w-[300px] shrink-0 rounded-xl overflow-hidden"
                                                style={{ backgroundColor: `${accent}12` }}
                                            >
                                                {/* Column header */}
                                                <div className="flex items-center justify-between px-4 py-3 border-b" style={{borderBlockColor: `${accent}25`}}>
                                                    <span className="text-sm font-semibold text-slate-800 capitalize">
                                                        {stage.name}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                                            style={{ color: accent, backgroundColor: `${accent}1A` }}
                                                        >
                                                            {isInitialLoading ? "…" : displayCount}
                                                        </span>
                                                        <KanbanColumnHandle asChild>
                                                            <button className="p-0.5 text-slate-400 hover:text-slate-600 cursor-grab transition-colors">
                                                                <GripVertical className="h-3.5 w-3.5" />
                                                            </button>
                                                        </KanbanColumnHandle>
                                                    </div>
                                                </div>

                                                {/* Cards area */}
                                                <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[300px]">
                                                    {isInitialLoading ? (
                                                        <>
                                                            <Skeleton className="h-[120px] w-full rounded-xl" />
                                                            <Skeleton className="h-[120px] w-full rounded-xl" />
                                                        </>
                                                    ) : (
                                                        <>
                                                            {leads.map((lead) => (
                                                                <KanbanItem key={lead.id} value={lead.id} asHandle>
                                                                    <KanbanLeadCard
                                                                        lead={lead}
                                                                        stageName={stageName}
                                                                        teamMembers={teamMembers}
                                                                        onAssigned={loadLeads}
                                                                        dragRef={dragRef}
                                                                        onNavigate={handleNavigate}
                                                                    />
                                                                </KanbanItem>
                                                            ))}

                                                            {/* Empty-column add button */}
                                                            {/* {leads.length === 0 && (
                                                                <button
                                                                    onClick={() => openAddLead(stage.id)}
                                                                    className="flex items-center gap-1.5 w-full rounded-lg px-2 py-2 text-xs text-slate-400 hover:text-slate-700 hover:bg-white/70 transition-colors"
                                                                >
                                                                    <Plus className="h-3.5 w-3.5" />
                                                                    Add lead
                                                                </button>
                                                            )} */}

                                                            {/* Load more */}
                                                            {col?.hasMore && !col.loading && (
                                                                <button
                                                                    onClick={() => loadMore(stage.id)}
                                                                    className="flex items-center justify-center gap-1.5 w-full rounded-lg px-2 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-white/70 transition-colors border border-dashed border-slate-200 hover:border-slate-300"
                                                                >
                                                                    <Plus className="h-3 w-3" />
                                                                    Load more{remaining > 0 ? ` (${remaining} remaining)` : ""}
                                                                </button>
                                                            )}

                                                            {/* Loading more spinner */}
                                                            {col?.loading && leads.length > 0 && (
                                                                <div className="flex justify-center py-2">
                                                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </KanbanColumn>
                                        );
                                    })}
                                </KanbanBoard>

                                {/* Drag overlay */}
                                <KanbanOverlay>
                                    <div className="h-full rounded-xl border-2 border-dashed border-blue-400/40 bg-blue-50/30" />
                                </KanbanOverlay>
                            </Kanban>
                        </div>
                    )
                )}

                {/* ── List View ─────────────────────────────────────────────────── */}
                {viewMode === "list" && (
                    <div
                        data-testid="leads-list"
                        data-loading={listLoading ? "true" : "false"}
                        className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                    >
                        <div className="divide-y divide-slate-100">
                            {listLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-4">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-40" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                ))
                            ) : !listLeads || listLeads.length === 0 ? (
                                <div className="py-16 text-center">
                                    <p className="text-slate-500 text-sm">No leads found</p>
                                    <button
                                        onClick={() => openAddLead()}
                                        className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add your first lead
                                    </button>
                                </div>
                            ) : (
                                listLeads.map((lead) => {
                                    const stage = stages.find((s) => s.id === stageId(lead.stage));
                                    const accent = stage ? (STAGE_ACCENT[stage.name.toLowerCase()] ?? "#94A3B8") : "#94A3B8";
                                    return (
                                        <div
                                            key={lead.id}
                                            data-testid="lead-row"
                                            data-lead-id={lead.id}
                                            data-lead-name={lead.full_name}
                                            onClick={() => router.push(`/leads/${lead.id}`)}
                                            className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarFallback className={`text-xs font-semibold ${avatarColor(lead.full_name ?? "")}`}>
                                                        {initials(lead.full_name ?? "?")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">{lead.full_name}</div>
                                                    {lead.phone && (
                                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{lead.phone}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {lead.is_queued && (
                                                    <span
                                                        className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter shrink-0"
                                                        style={{ color: "#B45309", backgroundColor: "#FEF3C7" }}
                                                        title="Queued for distribution at next office open"
                                                    >
                                                        Queued
                                                    </span>
                                                )}
                                                {lead.project?.name && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">
                                                        {lead.project.name}
                                                    </span>
                                                )}
                                                {stage && (
                                                    <span
                                                        className="text-xs font-bold capitalize px-2.5 py-0.5 rounded-full shrink-0"
                                                        style={{ color: accent, backgroundColor: `${accent}1A` }}
                                                    >
                                                        {stage.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Floating Action Button ────────────────────────────────────────── */}
            <button
                onClick={() => openAddLead()}
                className="fixed bottom-8 right-8 w-14 h-14 bg-[#2563eb] text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
                aria-label="Add lead"
            >
                <Plus className="h-7 w-7" />
            </button>
        </>
    );
}
