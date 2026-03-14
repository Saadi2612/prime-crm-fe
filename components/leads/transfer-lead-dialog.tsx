"use client";

import { useEffect, useState } from "react";
import { fetchTeamMembers, transferLead, type TeamMember } from "@/lib/api";
import type { Lead } from "@/types/leads";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowRightLeft } from "lucide-react";

interface TransferLeadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lead: Lead;
    onSuccess?: (updated: Lead) => void;
}

export function TransferLeadDialog({
    open,
    onOpenChange,
    lead,
    onSuccess,
}: TransferLeadDialogProps) {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [toUserId, setToUserId] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Derive current assignee id for filtering
    const currentAssigneeId =
        lead.assigned_to && typeof lead.assigned_to === "object"
            ? lead.assigned_to.id
            : typeof lead.assigned_to === "string"
            ? lead.assigned_to
            : null;

    useEffect(() => {
        if (!open) return;
        setToUserId("");
        setNote("");
        fetchTeamMembers()
            .then(setTeamMembers)
            .catch(() => {/* non-fatal */});
    }, [open]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!toUserId) return;
        setSubmitting(true);
        try {
            const updated = await transferLead(lead.id, toUserId, note.trim() || undefined);
            toast.success("Lead transferred successfully");
            onSuccess?.(updated);
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to transfer lead");
        } finally {
            setSubmitting(false);
        }
    }

    // Exclude the currently assigned agent from the list
    const availableMembers = teamMembers.filter((m) => m.id !== currentAssigneeId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        Transfer Lead
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Reassign{" "}
                        <span className="font-medium text-foreground">{lead.full_name}</span>{" "}
                        to another agent. The transfer will be recorded in the history.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1.5">
                            <Label>Assign To</Label>
                            <Select value={toUserId} onValueChange={setToUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an agent" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMembers.length === 0 ? (
                                        <SelectItem value="__none__" disabled>
                                            No other agents available
                                        </SelectItem>
                                    ) : (
                                        availableMembers.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                <span className="flex flex-col">
                                                    <span>{m.full_name}</span>
                                                    <span className="text-xs text-muted-foreground capitalize">
                                                        {m.role}
                                                    </span>
                                                </span>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="transfer_note">
                                Note{" "}
                                <span className="text-muted-foreground font-normal">
                                    (optional)
                                </span>
                            </Label>
                            <Textarea
                                id="transfer_note"
                                placeholder="Reason for transfer…"
                                className="resize-none min-h-[80px] text-sm"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting || !toUserId}
                            className="gap-2"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitting ? "Transferring…" : "Transfer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
