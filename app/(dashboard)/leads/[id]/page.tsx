"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Building2,
    CalendarDays,
    Check,
    Clock,
    DollarSign,
    MessageSquarePlus,
    Pencil,
    Phone,
    Ruler,
    StickyNote,
    Tag,
    Trash2,
    User2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import type { Lead, LeadNote, ProjectRef, StageRef } from "@/types/leads";
import type { Stage } from "@/types/leads";
import { fetchLead, fetchStages, deleteLead, updateLeadStage, updateLead, fetchLeadNotes, createLeadNote } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EditLeadDialog } from "@/components/leads/edit-lead-dialog";
import { formatBudget } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStageId(stage: Lead["stage"]): string {
    if (!stage) return "";
    if (typeof stage === "object") return (stage as StageRef).id;
    return stage;
}

function getProject(project: Lead["project"]): ProjectRef | null {
    if (!project) return null;
    if (typeof project === "object") return project as ProjectRef;
    return null;
}

function initials(name: string) {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [lead, setLead] = useState<Lead | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [changingStage, setChangingStage] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    // Notes state
    const [notes, setNotes] = useState<LeadNote[]>([]);
    const [notesLoading, setNotesLoading] = useState(true);
    const [newNoteBody, setNewNoteBody] = useState("");
    const [addingNote, setAddingNote] = useState(false);
    const [noteError, setNoteError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([fetchLead(id), fetchStages()])
            .then(([leadData, stagesData]) => {
                setLead(leadData);
                setStages(stagesData.sort((a, b) => a.order - b.order));
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    const loadNotes = useCallback(() => {
        setNotesLoading(true);
        fetchLeadNotes(id)
            .then(setNotes)
            .catch(() => { /* non-fatal */ })
            .finally(() => setNotesLoading(false));
    }, [id]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadNotes(); }, [loadNotes]);

    async function handleStageChange(newStageId: string) {
        if (!lead || changingStage) return;
        if (getStageId(lead.stage) === newStageId) return;
        setChangingStage(true);
        try {
            const updated = await updateLeadStage(lead.id, newStageId);
            setLead(updated);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update stage");
        } finally {
            setChangingStage(false);
        }
    }

    async function handleAddNote() {
        if (!lead || !newNoteBody.trim()) return;
        setAddingNote(true);
        setNoteError(null);
        try {
            const created = await createLeadNote(lead.id, newNoteBody.trim());
            setNotes((prev) => [created, ...prev]);
            setNewNoteBody("");
        } catch (e) {
            setNoteError(e instanceof Error ? e.message : "Failed to save note");
        } finally {
            setAddingNote(false);
        }
    }

    async function handleDelete() {
        if (!lead) return;
        setDeleting(true);
        try {
            await deleteLead(lead.id);
            router.push("/leads");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete lead");
            setDeleting(false);
        }
    }

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="max-w-5xl space-y-5">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-40" />
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-2xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-28" />
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <div className="flex gap-2 flex-wrap">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-9 w-28 rounded-full" />
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {[0, 1].map((i) => (
                        <div key={i} className="rounded-2xl border border-border bg-card p-6 space-y-3">
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-36" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Error ──────────────────────────────────────────────────────────────────
    if (error && !lead) {
        return (
            <div className="max-w-5xl">
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                    <p className="text-destructive font-medium">{error}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={load}>Try again</Button>
                </div>
            </div>
        );
    }

    if (!lead) return null;

    const currentStageId = getStageId(lead.stage);
    const project = getProject(lead.project);
    const budget = formatBudget(lead.min_budget, lead.max_budget);
    const inits = initials(lead.full_name);

    return (
        <div className="max-w-5xl space-y-4">
            <EditLeadDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                lead={lead}
                onSuccess={(updated) => setLead(updated)}
            />

            {/* ── Top bar ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
                    onClick={() => router.push("/leads")}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to leads
                </Button>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setEditOpen(true)}
                    >
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                disabled={deleting}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete <strong>{lead.full_name}</strong>? This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={handleDelete}
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* ── Hero card ─────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="h-1 w-full bg-primary/20" />
                <div className="p-6 flex items-center gap-5">
                    <div className="h-14 w-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 bg-primary/10 text-primary">
                        {inits}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">{lead.full_name}</h1>
                        {lead.job_title && (
                            <p className="text-sm text-muted-foreground mt-0.5">{lead.job_title}</p>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full shrink-0">
                        <Clock className="h-3 w-3 inline mr-1.5 -mt-0.5" />
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </div>
                </div>
            </div>

            {/* ── Pipeline stage ────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Pipeline Stage
                </p>
                <div className="flex flex-wrap gap-2">
                    {stages.map((stage) => {
                        const isActive = stage.id === currentStageId;
                        return (
                            <button
                                key={stage.id}
                                disabled={changingStage}
                                onClick={() => handleStageChange(stage.id)}
                                className={[
                                    "px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
                                    isActive
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-muted text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
                                    changingStage ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                                ].join(" ")}
                            >
                                {stage.name}
                            </button>
                        );
                    })}
                </div>
                {error && <p className="text-xs text-destructive mt-3">{error}</p>}
            </div>

            {/* ── Info grid ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Contact Info */}
                <div className="rounded-2xl border border-border bg-card p-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                        Contact Info
                    </p>
                    <div className="space-y-3">
                        {lead.phone ? (
                            <a
                                href={`tel:${lead.phone}`}
                                className="flex items-center gap-3 text-sm text-foreground group hover:text-primary transition-colors"
                            >
                                <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                </span>
                                <span className="group-hover:underline">{lead.phone}</span>
                            </a>
                        ) : null}
                        {lead.job_title ? (
                            <div className="flex items-center gap-3 text-sm text-foreground">
                                <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <User2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </span>
                                <span>{lead.job_title}</span>
                            </div>
                        ) : null}
                        {lead.next_follow_up ? (
                            <div className="flex items-center gap-3 text-sm text-foreground">
                                <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                </span>
                                <span>Follow-up: {new Date(lead.next_follow_up).toLocaleDateString()}</span>
                            </div>
                        ) : null}
                        {!lead.phone && !lead.job_title && !lead.next_follow_up && (
                            <p className="text-sm text-muted-foreground italic">No contact details</p>
                        )}
                    </div>
                </div>

                {/* Associated Project */}
                <div className="rounded-2xl border border-border bg-card p-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                        {project ? "Associated Project" : "Details"}
                    </p>
                    <div className="space-y-3">
                        {project ? (
                            <>
                                <div className="flex items-start gap-3">
                                    <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{project.name}</p>
                                        {project.address && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{project.address}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                        <Tag className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="capitalize">{project.type}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                        <Ruler className="h-3.5 w-3.5" />
                                    </span>
                                    <span>{project.size} {project.size_unit}</span>
                                </div>
                                {project.price && (
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                            <DollarSign className="h-3.5 w-3.5" />
                                        </span>
                                        <span>PKR {Number(project.price).toLocaleString()}</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No project linked</p>
                        )}

                        {budget && (
                            <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2 mt-1 border-t border-border">
                                <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <DollarSign className="h-3.5 w-3.5" />
                                </span>
                                <span>Budget: <span className="font-medium text-foreground">{budget}</span></span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Notes ─────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-5">
                    <StickyNote className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Notes
                    </p>
                    {notes.length > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {notes.length}
                        </span>
                    )}
                </div>

                {/* Existing notes timeline */}
                {notesLoading ? (
                    <div className="space-y-3 mb-5">
                        <Skeleton className="h-16 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                ) : notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic mb-5">No notes yet.</p>
                ) : (
                    <div className="space-y-3 mb-5">
                        {notes.map((note) => (
                            <div
                                key={note.id}
                                className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-1"
                            >
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                    {note.body}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add new note */}
                <div className="border-t border-border pt-4 space-y-2">
                    <Textarea
                        ref={textareaRef}
                        value={newNoteBody}
                        onChange={(e) => setNewNoteBody(e.target.value)}
                        placeholder="Write a note..."
                        className="min-h-[90px] resize-none text-sm"
                        disabled={addingNote}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handleAddNote();
                            }
                        }}
                    />
                    {noteError && (
                        <p className="text-xs text-destructive">{noteError}</p>
                    )}
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={handleAddNote}
                            disabled={addingNote || !newNoteBody.trim()}
                        >
                            <MessageSquarePlus className="h-3.5 w-3.5" />
                            {addingNote ? "Saving…" : "Add Note"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
