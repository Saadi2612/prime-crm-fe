"use client";

import type { Lead, Stage } from "@/types/leads";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadCard } from "@/components/leads/lead-card";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KanbanColumnProps {
    stage: Stage;
    leads: Lead[];
    isLoading?: boolean;
    onAddLead?: (stageId: string) => void;
    onEditLead?: (lead: Lead) => void;
    onDeleteLead?: (id: string) => void;
}

// Stage color indicator mapping
const stageColors: Record<string, string> = {
    new: "bg-gray-400",
    contacted: "bg-orange-400",
    viewing: "bg-orange-400",
    negotiation: "bg-orange-400",
    qualified: "bg-green-500",
    won: "bg-green-500",
    lost: "bg-gray-300",
};

// Stage column background mapping
const stageColumnBg: Record<string, string> = {
    new: "bg-slate-50",
    contacted: "bg-yellow-50",
    viewing: "bg-blue-50",
    negotiation: "bg-orange-50/60",
    qualified: "bg-green-50",
    won: "bg-green-50",
    lost: "bg-gray-50",
};

export function KanbanColumn({
    stage,
    leads,
    isLoading,
    onAddLead,
    onEditLead,
    onDeleteLead,
}: KanbanColumnProps) {
    const dotColor = stageColors[stage.name.toLowerCase()] ?? "bg-primary";
    const columnBg = stageColumnBg[stage.name.toLowerCase()] ?? "bg-muted/30";

    return (
        <div className="flex flex-col min-w-[240px] w-[240px] shrink-0">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    <h3 className="text-sm font-semibold capitalize text-foreground">
                        {stage.name}
                    </h3>
                    <Badge
                        variant="secondary"
                        className="h-5 min-w-5 rounded-full px-1.5 text-xs font-medium"
                    >
                        {leads.length}
                    </Badge>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={() => onAddLead?.(stage.id)}
                >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Cards Container */}
            <div
                className={`flex flex-col gap-2 rounded-xl p-2 flex-1 min-h-[400px] ${columnBg} border border-border/40`}
            >
                {isLoading ? (
                    <>
                        <Skeleton className="h-[60px] w-full rounded-lg" />
                        <Skeleton className="h-[60px] w-full rounded-lg" />
                    </>
                ) : (
                    <>
                        {leads.map((lead) => (
                            <LeadCard
                                key={lead.id}
                                lead={lead}
                                onEdit={onEditLead}
                                onDelete={onDeleteLead}
                            />
                        ))}
                        {/* Add card placeholder */}
                        <button
                            onClick={() => onAddLead?.(stage.id)}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors w-full"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add lead
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
