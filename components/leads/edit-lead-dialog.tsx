"use client";

import { useEffect, useState } from "react";
import type { Lead, Stage } from "@/types/leads";
import {
    fetchProjects,
    fetchStages,
    fetchTeamMembers,
    updateLead,
    type Project,
    type TeamMember,
} from "@/lib/api";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function stageId(stage: Lead["stage"]): string {
    if (!stage) return "";
    if (typeof stage === "object") return stage.id;
    return stage;
}

function projectId(project: Lead["project"]): string {
    return project?.id ?? "";
}

function assignedId(assigned: Lead["assigned_to"]): string {
    if (!assigned) return "";
    if (typeof assigned === "object" && "id" in assigned) return (assigned as { id: string }).id;
    if (typeof assigned === "string") return assigned;
    return "";
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditLeadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lead: Lead;
    onSuccess?: (lead: Lead) => void;
}

interface FormState {
    full_name: string;
    email: string;
    phone: string;
    job_title: string;
    min_budget: string;
    max_budget: string;
    next_follow_up: string;
    notes: string;
    stage: string;
    project: string;
    assigned_to: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditLeadDialog({ open, onOpenChange, lead, onSuccess }: EditLeadDialogProps) {
    const [form, setForm] = useState<FormState>(toFormState(lead));
    const [stages, setStages] = useState<Stage[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

    // Reset form to fresh lead data whenever dialog opens
    useEffect(() => {
        if (!open) return;
        setForm(toFormState(lead));
        setError(null);
        setFieldErrors({});

        Promise.allSettled([fetchStages(), fetchProjects(), fetchTeamMembers()]).then(
            ([stagesRes, projectsRes, membersRes]) => {
                if (stagesRes.status === "fulfilled") setStages(stagesRes.value.sort((a, b) => a.order - b.order));
                if (projectsRes.status === "fulfilled") setProjects(projectsRes.value);
                if (membersRes.status === "fulfilled") setTeamMembers(membersRes.value);
            }
        );
    }, [open, lead]);

    function set(field: keyof FormState, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function validate(): boolean {
        const errors: Partial<Record<keyof FormState, string>> = {};
        if (!form.full_name.trim()) errors.full_name = "Full name is required";
        if (!form.email.trim()) errors.email = "Email is required";
        if (form.min_budget && form.max_budget) {
            if (Number(form.min_budget) > Number(form.max_budget))
                errors.max_budget = "Max budget must be ≥ min budget";
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setError(null);

        // The write API accepts IDs for relational fields, not nested objects.
        // Use a plain Record here rather than Partial<Lead> which expects ProjectRef.
        const payload: Record<string, unknown> = {
            full_name: form.full_name.trim(),
            email: form.email.trim() || undefined,
            phone: form.phone.trim() || undefined,
            job_title: form.job_title.trim() || undefined,
            min_budget: form.min_budget ? Number(form.min_budget) : undefined,
            max_budget: form.max_budget ? Number(form.max_budget) : undefined,
            next_follow_up: form.next_follow_up || undefined,
            notes: form.notes.trim() || undefined,
            ...(form.stage && { stage: form.stage }),
            ...(form.project && { project: form.project }),
            ...(form.assigned_to && { assigned_to: form.assigned_to }),
        };

        try {
            const updated = await updateLead(lead.id, payload);
            onSuccess?.(updated);
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Edit Lead</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Update the details for <span className="font-medium text-foreground">{lead.full_name}</span>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="grid gap-5 py-4">
                        {/* Error banner */}
                        {error && (
                            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* ── Contact Info ── */}
                        <fieldset className="space-y-4">
                            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Contact Info
                            </legend>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_full_name">
                                    Full Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit_full_name"
                                    placeholder="e.g. John Smith"
                                    value={form.full_name}
                                    onChange={(e) => set("full_name", e.target.value)}
                                    className={fieldErrors.full_name ? "border-destructive" : ""}
                                />
                                {fieldErrors.full_name && (
                                    <p className="text-xs text-destructive">{fieldErrors.full_name}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_email">
                                    Email <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit_email"
                                    type="email"
                                    placeholder="example@gmail.com"
                                    value={form.email}
                                    onChange={(e) => set("email", e.target.value)}
                                    className={fieldErrors.email ? "border-destructive" : ""}
                                />
                                {fieldErrors.email && (
                                    <p className="text-xs text-destructive">{fieldErrors.email}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_phone">Phone</Label>
                                    <Input
                                        id="edit_phone"
                                        type="tel"
                                        placeholder="+92 300 0000000"
                                        value={form.phone}
                                        onChange={(e) => set("phone", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_job_title">Job Title</Label>
                                    <Input
                                        id="edit_job_title"
                                        placeholder="e.g. Manager"
                                        value={form.job_title}
                                        onChange={(e) => set("job_title", e.target.value)}
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {/* ── Lead Details ── */}
                        <fieldset className="space-y-4">
                            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Lead Details
                            </legend>

                            <div className="space-y-1.5">
                                <Label>Stage</Label>
                                <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stages.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                <span className="capitalize">{s.name}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Project</Label>
                                <Select value={form.project} onValueChange={(v) => set("project", v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">— No project —</SelectItem>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Assigned To</Label>
                                <Select value={form.assigned_to} onValueChange={(v) => set("assigned_to", v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select team member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">— Unassigned —</SelectItem>
                                        {teamMembers.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_next_follow_up">Next Follow-Up</Label>
                                <Input
                                    id="edit_next_follow_up"
                                    type="date"
                                    value={form.next_follow_up}
                                    onChange={(e) => set("next_follow_up", e.target.value)}
                                />
                            </div>
                        </fieldset>

                        {/* ── Budget ── */}
                        <fieldset className="space-y-4">
                            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Budget
                            </legend>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_min_budget">Min Budget</Label>
                                    <Input
                                        id="edit_min_budget"
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={form.min_budget}
                                        onChange={(e) => set("min_budget", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_max_budget">Max Budget</Label>
                                    <Input
                                        id="edit_max_budget"
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={form.max_budget}
                                        onChange={(e) => set("max_budget", e.target.value)}
                                        className={fieldErrors.max_budget ? "border-destructive" : ""}
                                    />
                                    {fieldErrors.max_budget && (
                                        <p className="text-xs text-destructive">{fieldErrors.max_budget}</p>
                                    )}
                                </div>
                            </div>
                        </fieldset>

                        {/* ── Notes ── */}
                        <div className="space-y-1.5">
                            <Label htmlFor="edit_notes">Notes</Label>
                            <Textarea
                                id="edit_notes"
                                placeholder="Add any notes about this lead..."
                                className="resize-none min-h-[90px]"
                                value={form.notes}
                                onChange={(e) => set("notes", e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} className="gap-2">
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitting ? "Saving…" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Helper: Lead → FormState ──────────────────────────────────────────────────

function toFormState(lead: Lead): FormState {
    return {
        full_name: lead.full_name ?? "",
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        job_title: lead.job_title ?? "",
        min_budget: lead.min_budget != null ? String(lead.min_budget) : "",
        max_budget: lead.max_budget != null ? String(lead.max_budget) : "",
        // API may return ISO datetime; keep only date part
        next_follow_up: lead.next_follow_up ? lead.next_follow_up.slice(0, 10) : "",
        notes: lead.notes ?? "",
        stage: stageId(lead.stage),
        project: projectId(lead.project),
        assigned_to: assignedId(lead.assigned_to),
    };
}
