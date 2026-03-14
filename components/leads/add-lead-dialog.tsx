"use client";

import { useEffect, useState } from "react";
import type { Lead, Stage } from "@/types/leads";
import {
    createLead,
    fetchProjects,
    fetchStages,
    fetchTeamMembers,
    type Project,
    type TeamMember,
} from "@/lib/api";
import { toast } from "sonner";

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

interface AddLeadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultStageId?: string;
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

const EMPTY_FORM: FormState = {
    full_name: "",
    email: "",
    phone: "",
    job_title: "",
    min_budget: "",
    max_budget: "",
    next_follow_up: "",
    notes: "",
    stage: "",
    project: "",
    assigned_to: "",
};

export function AddLeadDialog({
    open,
    onOpenChange,
    defaultStageId,
    onSuccess,
}: AddLeadDialogProps) {
    const [form, setForm] = useState<FormState>({
        ...EMPTY_FORM,
        stage: defaultStageId ?? "",
    });
    const [stages, setStages] = useState<Stage[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

    // Load dropdowns on first open
    useEffect(() => {
        if (!open) return;
        setForm({ ...EMPTY_FORM, stage: defaultStageId ?? "" });
        setFieldErrors({});

        Promise.allSettled([fetchStages(), fetchProjects(), fetchTeamMembers()]).then(
            ([stagesRes, projectsRes, membersRes]) => {
                if (stagesRes.status === "fulfilled") setStages(stagesRes.value.sort((a, b) => a.order - b.order));
                if (projectsRes.status === "fulfilled") setProjects(projectsRes.value);
                if (membersRes.status === "fulfilled") setTeamMembers(membersRes.value);
            }
        );
    }, [open, defaultStageId]);

    function set(field: keyof FormState, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) {
            setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    }

    function validate(): boolean {
        const errors: Partial<Record<keyof FormState, string>> = {};
        if (!form.full_name.trim()) errors.full_name = "Full name is required";
        // if (!form.email.trim()) errors.email = "Email is required";
        if (form.min_budget && form.max_budget) {
            if (Number(form.min_budget) > Number(form.max_budget)) {
                errors.max_budget = "Max budget must be ≥ min budget";
            }
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);

        // The write API accepts IDs for relational fields, not nested objects.
        // Use a plain Record here rather than Partial<Lead> which expects ProjectRef.
        const payload: Record<string, unknown> = {
            full_name: form.full_name.trim(),
            ...(form.email && { email: form.email.trim() }),
            ...(form.phone && { phone: form.phone.trim() }),
            ...(form.job_title && { job_title: form.job_title.trim() }),
            ...(form.min_budget && { min_budget: Number(form.min_budget) }),
            ...(form.max_budget && { max_budget: Number(form.max_budget) }),
            ...(form.next_follow_up && { next_follow_up: form.next_follow_up }),
            ...(form.notes && { notes: form.notes.trim() }),
            ...(form.stage && { stage: form.stage }),
            ...(form.project && { project: form.project }),
            ...(form.assigned_to && { assigned_to: form.assigned_to }),
        };

        try {
            const created = await createLead(payload);
            toast.success("Lead created successfully");
            onSuccess?.(created);
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Add New Lead</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Fill in the details below to create a new lead.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="grid gap-5 py-4">
                        {/* ── Contact Info ── */}
                        <fieldset className="space-y-4">
                            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Contact Info
                            </legend>

                            {/* Full Name */}
                            <div className="space-y-1.5">
                                <Label htmlFor="full_name">
                                    Full Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="full_name"
                                    placeholder="e.g. John Smith"
                                    value={form.full_name}
                                    onChange={(e) => set("full_name", e.target.value)}
                                    className={fieldErrors.full_name ? "border-destructive" : ""}
                                />
                                {fieldErrors.full_name && (
                                    <p className="text-xs text-destructive">{fieldErrors.full_name}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <Label htmlFor="email">
                                    Email <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="email"
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
                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+92 300 0000000"
                                        value={form.phone}
                                        onChange={(e) => set("phone", e.target.value)}
                                    />
                                </div>

                                {/* Job Title */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="job_title">Job Title</Label>
                                    <Input
                                        id="job_title"
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

                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Stage */}
                                <div className="space-y-1.5">
                                    <Label>Stage</Label>
                                    <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                                        <SelectTrigger className="w-full">
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

                                {/* Project */}
                                <div className="space-y-1.5">
                                    <Label>Project</Label>
                                    <Select value={form.project} onValueChange={(v) => set("project", v)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select a project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground">No projects found</div>
                                            ) : (
                                                projects.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Assigned To */}
                                <div className="space-y-1.5">
                                    <Label>Assigned To</Label>
                                    <Select value={form.assigned_to} onValueChange={(v) => set("assigned_to", v)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select team member" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teamMembers.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground">No team members found</div>
                                            ) : (
                                                teamMembers.map((m) => (
                                                    <SelectItem key={m.id} value={m.id}>
                                                        {m.full_name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Follow-Up Date */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="next_follow_up">Next Follow-Up</Label>
                                    <Input
                                        id="next_follow_up"
                                        type="date"
                                        value={form.next_follow_up}
                                        onChange={(e) => set("next_follow_up", e.target.value)}
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {/* ── Budget ── */}
                        <fieldset className="space-y-4">
                            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Budget
                            </legend>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="min_budget">Min Budget</Label>
                                    <Input
                                        id="min_budget"
                                        type="number"
                                        min={0}
                                        placeholder="0.00"
                                        value={form.min_budget}
                                        onChange={(e) => set("min_budget", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="max_budget">Max Budget</Label>
                                    <Input
                                        id="max_budget"
                                        type="number"
                                        min={0}
                                        placeholder="0.00"
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
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
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
                            {submitting ? "Creating…" : "Create Lead"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
