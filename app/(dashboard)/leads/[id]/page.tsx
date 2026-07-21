"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    ArrowRightLeft,
    Building2,
    CalendarClock,
    DollarSign,
    FileText,
    Megaphone,
    MessageSquarePlus,
    Pencil,
    Phone,
    Ruler,
    StickyNote,
    Tag,
    Trash2,
    User2,
    Users,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

import type { Lead, LeadNote, ProjectRef, StageRef } from "@/types/leads";
import type { Stage } from "@/types/leads";
import { fetchLead, fetchStages, deleteLead, updateLeadStage, linkProjectToLead, fetchLeadNotes, createLeadNote } from "@/lib/api";
import { toast } from "sonner";
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
import { TransferLeadDialog } from "@/components/leads/transfer-lead-dialog";
import { formatBudget } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

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
    const { user } = useAuth();

    const [lead, setLead] = useState<Lead | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [changingStage, setChangingStage] = useState(false);
    const [linkingProject, setLinkingProject] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);

    const [notes, setNotes] = useState<LeadNote[]>([]);
    const [notesLoading, setNotesLoading] = useState(true);
    const [newNoteBody, setNewNoteBody] = useState("");
    const [followUpDate, setFollowUpDate] = useState("");
    const [followUpTime, setFollowUpTime] = useState("");
    const [addingNote, setAddingNote] = useState(false);
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
            toast.success("Stage updated");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to update stage");
        } finally {
            setChangingStage(false);
        }
    }

    async function handleLinkSuggestedProject() {
        if (!lead || linkingProject || !lead.suggested_project) return;
        setLinkingProject(true);
        try {
            const updated = await linkProjectToLead(lead.id, lead.suggested_project.id);
            setLead(updated);
            toast.success("Project linked");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to link project");
        } finally {
            setLinkingProject(false);
        }
    }

    async function handleAddNote() {
        if (!lead || !newNoteBody.trim()) return;
        setAddingNote(true);
        try {
            const payloadFollowUp = followUpDate
                ? new Date(`${followUpDate}T${followUpTime || "12:00"}`).toISOString()
                : null;
            const created = await createLeadNote(lead.id, newNoteBody.trim(), payloadFollowUp);
            setNotes((prev) => [created, ...prev]);
            setNewNoteBody("");
            setFollowUpDate("");
            setFollowUpTime("");
            toast.success("Note added");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to save note");
        } finally {
            setAddingNote(false);
        }
    }

    async function handleDelete() {
        if (!lead) return;
        setDeleting(true);
        try {
            await deleteLead(lead.id);
            toast.success("Lead deleted");
            router.push("/leads");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete lead");
            setDeleting(false);
        }
    }

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex-1 min-h-full bg-[#EFF3F8]">
                <div className="p-8 max-w-7xl mx-auto space-y-6">
                    <div className="flex items-end justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <Skeleton className="h-20 w-20 rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-48" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-16" />
                            <Skeleton className="h-9 w-20" />
                            <Skeleton className="h-9 w-16" />
                        </div>
                    </div>
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-40 rounded-xl" />
                                <Skeleton className="h-40 rounded-xl" />
                            </div>
                            <Skeleton className="h-64 rounded-xl" />
                        </div>
                        <Skeleton className="h-96 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    // ── Error ──────────────────────────────────────────────────────────────────
    if (error && !lead) {
        return (
            <div className="flex-1 min-h-full bg-[#EFF3F8]">
                <div className="p-8 max-w-7xl mx-auto">
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                        <p className="text-destructive font-medium">{error}</p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={load}>Try again</Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!lead) return null;

    const currentStageId = getStageId(lead.stage);
    const project = getProject(lead.project);
    const budget = formatBudget(lead.min_budget, lead.max_budget);
    const inits = initials(lead.full_name);
    const history = lead.transfer_history ?? [];

    const formatKey = (k: string) =>
        k.replace(/_+$/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const formatValue = (v: string) =>
        v.replace(/_+$/, "").replace(/_/g, " ");

    return (
        <div className="flex-1 min-h-full bg-[#EFF3F8]">
            <EditLeadDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                lead={lead}
                onSuccess={(updated) => setLead(updated)}
            />
            <TransferLeadDialog
                open={transferOpen}
                onOpenChange={setTransferOpen}
                lead={lead}
                onSuccess={(updated) => setLead(updated)}
            />

            <div className="p-8 max-w-7xl mx-auto w-full space-y-6">

                {/* ── Back button ───────────────────────────────────────────── */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
                    onClick={() => router.push("/leads")}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to leads
                </Button>

                {/* ── Hero ──────────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="h-20 w-20 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shrink-0">
                            {inits}
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">{lead.full_name}</h1>
                                {lead.leadgen_id && (
                                    <span
                                        className="inline-block text-[9px] font-bold uppercase tracking-[0.08em] rounded-md px-2 py-1"
                                        style={{ color: "#1877F2", backgroundColor: "#E7F0FE" }}
                                        title="Sourced from Meta lead ads"
                                    >
                                        via Meta
                                    </span>
                                )}
                            </div>
                            {lead.job_title && (
                                <p className="text-muted-foreground font-medium mt-0.5">{lead.job_title}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setEditOpen(true)}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                        </Button>
                        {(user?.role === "admin" || user?.role === "manager") && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setTransferOpen(true)}
                            >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                Transfer
                            </Button>
                        )}
                        {user?.role === "admin" && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                        disabled={deleting}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
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
                        )}
                    </div>
                </div>

                {/* ── Pipeline tracker ──────────────────────────────────────── */}
                <div className="bg-card rounded-xl shadow-sm overflow-hidden flex">
                    {stages.map((stage, i) => {
                        const isActive = stage.id === currentStageId;
                        return (
                            <button
                                key={stage.id}
                                disabled={changingStage}
                                onClick={() => handleStageChange(stage.id)}
                                className={[
                                    "flex-1 py-3 px-4 text-center text-xs font-bold uppercase tracking-wider transition-all duration-150",
                                    isActive
                                        ? "bg-primary/10 text-primary border-b-2 border-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    changingStage ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                                    i > 0 ? "border-l border-border" : "",
                                ].join(" ")}
                            >
                                {stage.name}
                            </button>
                        );
                    })}
                </div>

                {/* ── Bento grid ────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left 2/3 — main content */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Contact Info + Linked Projects */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Contact Info */}
                            <div className="bg-card rounded-xl p-6 shadow-sm">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                                    Contact Info
                                </h3>
                                <div className="space-y-4">
                                    {lead.phone ? (
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground mb-1">Phone</p>
                                            <a
                                                href={`tel:${lead.phone}`}
                                                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                                            >
                                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                                {lead.phone}
                                            </a>
                                        </div>
                                    ) : null}
                                    {lead.job_title ? (
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground mb-1">Role</p>
                                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                                <User2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                {lead.job_title}
                                            </div>
                                        </div>
                                    ) : null}
                                    {notes[0]?.next_follow_up ? (
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground mb-1">Next Follow-up</p>
                                            <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                                                <CalendarClock className="h-3.5 w-3.5" />
                                                {format(new Date(notes[0].next_follow_up), "dd/MM/yyyy hh:mm a")}
                                            </div>
                                        </div>
                                    ) : null}
                                    {!lead.phone && !lead.job_title && !notes[0]?.next_follow_up && (
                                        <p className="text-sm text-muted-foreground italic">No contact details</p>
                                    )}
                                </div>
                            </div>

                            {/* Linked Projects */}
                            <div className="bg-card rounded-xl p-6 shadow-sm">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                                    Linked Projects
                                </h3>
                                {project ? (
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{project.name}</p>
                                                {project.address && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{project.address}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Tag className="h-3.5 w-3.5 shrink-0" />
                                            <span className="capitalize">{project.type}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Ruler className="h-3.5 w-3.5 shrink-0" />
                                            <span>{project.size} {project.size_unit}</span>
                                        </div>
                                        {project.price && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                                                <span>PKR {Number(project.price).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {budget && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                                                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                                                <span>Budget: <span className="font-medium text-foreground">{budget}</span></span>
                                            </div>
                                        )}
                                    </div>
                                ) : lead.suggested_project ? (
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{lead.suggested_project.name}</p>
                                                {lead.suggested_project.address && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{lead.suggested_project.address}</p>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground italic">Possible match — same Meta form</p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            disabled={linkingProject}
                                            onClick={handleLinkSuggestedProject}
                                        >
                                            {linkingProject ? "Linking..." : "Link this project"}
                                        </Button>
                                    </div>
                                ) : lead.leadgen_id ? (
                                    <div className="space-y-3 py-2">
                                        {(lead.form_name || lead.form_id) && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                                <span>Form: <span className="font-medium text-foreground">{lead.form_name || lead.form_id}</span></span>
                                            </div>
                                        )}
                                        {(lead.ad_name || lead.ad_id) && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Megaphone className="h-3.5 w-3.5 shrink-0" />
                                                <span>Ad: <span className="font-medium text-foreground">{lead.ad_name || lead.ad_id}</span></span>
                                            </div>
                                        )}
                                        {lead.campaign_name && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Tag className="h-3.5 w-3.5 shrink-0" />
                                                <span>Campaign: <span className="font-medium text-foreground">{lead.campaign_name}</span></span>
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground italic pt-1">No project linked yet</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center py-6">
                                        <p className="text-sm text-muted-foreground italic">No project linked</p>
                                    </div>
                                )}
                                {!project && budget && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 mt-3 border-t border-border">
                                        <DollarSign className="h-3.5 w-3.5 shrink-0" />
                                        <span>Budget: <span className="font-medium text-foreground">{budget}</span></span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Form Responses */}
                        {lead.custom_data && Object.keys(lead.custom_data).length > 0 && (
                            <div className="bg-card rounded-xl p-6 shadow-sm">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">
                                    Form Responses
                                </h3>
                                <div className="space-y-5">
                                    {Object.entries(lead.custom_data!).map(([key, value]) => (
                                        <div key={key}>
                                            <label className="block text-xs font-bold text-muted-foreground mb-2">
                                                {formatKey(key)}
                                            </label>
                                            <div className="bg-muted/50 px-4 py-3 rounded-lg border-l-4 border-primary text-foreground font-medium text-sm capitalize">
                                                {formatValue(value) || <span className="italic text-muted-foreground">—</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Transfer History */}
                        <div className="bg-card rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    Transfer History
                                </h3>
                                {history.length > 0 && (
                                    <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        {history.length} transfer{history.length !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>
                            {history.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No transfers yet.</p>
                            ) : (
                                <div className="relative pl-8 border-l-2 border-border space-y-6">
                                    {history.map((t) => (
                                        <div key={t.id} className="relative">
                                            <div className="absolute -left-[41px] top-0 h-4 w-4 rounded-full bg-primary border-4 border-card" />
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground mb-1">
                                                        {t.from_user ? "Lead Transferred" : "Lead Assigned"}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-muted-foreground">
                                                            {t.from_user?.full_name ?? "Unassigned"}
                                                        </span>
                                                        <span className="text-muted-foreground">→</span>
                                                        <span className="text-primary font-bold">
                                                            {t.to_user?.full_name ?? "Unknown"}
                                                        </span>
                                                    </div>
                                                    {t.transferred_by && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            by {t.transferred_by.full_name}
                                                        </p>
                                                    )}
                                                    {t.note && (
                                                        <p className="text-xs text-muted-foreground italic mt-0.5">
                                                            &quot;{t.note}&quot;
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {format(new Date(t.created_at), "yyyy-MM-dd")}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground/60 font-mono">
                                                        {format(new Date(t.created_at), "hh:mm a")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right 1/3 — Notes sidebar */}
                    <div className="space-y-4">
                        <div className="bg-card rounded-xl p-6 shadow-sm flex flex-col">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    Internal Notes
                                </h3>
                                <StickyNote className="h-4 w-4 text-muted-foreground/40" />
                            </div>

                            {/* Notes list */}
                            {notesLoading ? (
                                <div className="space-y-2 mb-5">
                                    <Skeleton className="h-16 w-full rounded-lg" />
                                    <Skeleton className="h-12 w-full rounded-lg" />
                                </div>
                            ) : notes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 mb-5 bg-muted/30 rounded-lg border border-dashed border-border">
                                    <StickyNote className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                    <p className="text-sm text-muted-foreground italic">No notes yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3 mb-5 max-h-80 overflow-y-auto pr-1">
                                    {notes.map((note) => (
                                        <div
                                            key={note.id}
                                            className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-2"
                                        >
                                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                                {note.body}
                                            </p>
                                            <div className="flex items-center justify-between flex-wrap gap-1">
                                                <p className="text-[11px] text-muted-foreground">
                                                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                                                </p>
                                                {note.next_follow_up && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                        <CalendarClock className="h-2.5 w-2.5" />
                                                        {format(new Date(note.next_follow_up), "dd/MM/yy hh:mm a")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add note form */}
                            <div className="space-y-3 border-t border-border pt-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-2">
                                        Write a note...
                                    </label>
                                    <Textarea
                                        ref={textareaRef}
                                        value={newNoteBody}
                                        onChange={(e) => setNewNoteBody(e.target.value)}
                                        placeholder="Add some context about the call..."
                                        className="min-h-[90px] resize-none text-sm bg-muted/40 border-0 focus-visible:ring-1"
                                        disabled={addingNote}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                                e.preventDefault();
                                                handleAddNote();
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-2">
                                        Follow-up date
                                    </label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="relative flex-1">
                                            <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                            <input
                                                type="date"
                                                value={followUpDate}
                                                onChange={(e) => setFollowUpDate(e.target.value)}
                                                disabled={addingNote}
                                                className="w-full pl-9 h-9 rounded-lg border border-border bg-muted/40 px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                                            />
                                        </div>
                                        {followUpDate && (
                                            <input
                                                type="time"
                                                value={followUpTime}
                                                onChange={(e) => setFollowUpTime(e.target.value)}
                                                disabled={addingNote}
                                                className="h-9 w-28 rounded-lg border border-border bg-muted/40 px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                                            />
                                        )}
                                        {followUpDate && (
                                            <button
                                                type="button"
                                                onClick={() => { setFollowUpDate(""); setFollowUpTime(""); }}
                                                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    className="w-full gap-2"
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
            </div>
        </div>
    );
}
