"use client";

import { useState } from "react";
import type { Stage } from "@/types/leads";
import { exportLeads } from "@/lib/api";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ExportLeadsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stages: Stage[];
}

export function ExportLeadsDialog({ open, onOpenChange, stages }: ExportLeadsDialogProps) {
    const [selectAll, setSelectAll] = useState(false);
    const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
    const [exporting, setExporting] = useState(false);

    function toggleAll(checked: boolean) {
        setSelectAll(checked);
        if (checked) setSelectedStageIds([]);
    }

    function toggleStage(stageId: string, checked: boolean) {
        setSelectedStageIds((prev) =>
            checked ? [...prev, stageId] : prev.filter((id) => id !== stageId)
        );
    }

    async function handleExport() {
        setExporting(true);
        try {
            await exportLeads(
                selectAll ? { all: true } : { stageIds: selectedStageIds }
            );
            toast.success("Export ready — check your downloads");
            onOpenChange(false);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to export leads");
        } finally {
            setExporting(false);
        }
    }

    const canExport = selectAll || selectedStageIds.length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Export Leads</DialogTitle>
                    <DialogDescription>
                        Choose which leads to include. Exports as an Excel file, grouped by stage.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <label className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                            checked={selectAll}
                            onCheckedChange={(checked) => toggleAll(checked === true)}
                        />
                        <Label className="font-medium cursor-pointer">All leads</Label>
                    </label>

                    <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                        {stages.map((stage) => (
                            <label
                                key={stage.id}
                                className={`flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/50 ${
                                    selectAll ? "opacity-50 pointer-events-none" : ""
                                }`}
                            >
                                <Checkbox
                                    checked={selectedStageIds.includes(stage.id)}
                                    disabled={selectAll}
                                    onCheckedChange={(checked) =>
                                        toggleStage(stage.id, checked === true)
                                    }
                                />
                                <Label className="cursor-pointer">{stage.name}</Label>
                            </label>
                        ))}
                    </div>
                </div>

                <DialogFooter className="gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={exporting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={exporting || !canExport}
                        onClick={handleExport}
                        className="gap-2"
                    >
                        {exporting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {exporting ? "Exporting…" : "Export"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
