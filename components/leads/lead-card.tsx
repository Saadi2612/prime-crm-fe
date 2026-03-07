"use client";

import Link from "next/link";
import type { Lead } from "@/types/leads";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLink, MoreHorizontal, Phone, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeadCardProps {
    lead: Lead;
    onEdit?: (lead: Lead) => void;
    onDelete?: (id: string) => void;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

// Consistent color per lead (based on name hash)
function getAvatarColor(name: string): string {
    const colors = [
        "bg-blue-100 text-blue-700",
        "bg-purple-100 text-purple-700",
        "bg-green-100 text-green-700",
        "bg-orange-100 text-orange-700",
        "bg-pink-100 text-pink-700",
        "bg-yellow-100 text-yellow-700",
        "bg-cyan-100 text-cyan-700",
    ];
    const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

export function LeadCard({ lead, onEdit, onDelete }: LeadCardProps) {
    const initials = getInitials(lead.full_name);
    const avatarColor = getAvatarColor(lead.full_name);

    return (
        <div className="group bg-card rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className={`text-xs font-medium ${avatarColor}`}>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground truncate">
                        {lead.full_name}
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {/* Quick open icon — always visible on hover */}
                    <Link
                        href={`/leads/${lead.id}`}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                    </Link>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem asChild>
                                <Link href={`/leads/${lead.id}`} className="flex items-center">
                                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                    View Details
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit?.(lead)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Edit Lead
                            </DropdownMenuItem>
                            {lead.phone && (
                                <DropdownMenuItem asChild>
                                    <a href={`tel:${lead.phone}`}>
                                        <Phone className="mr-2 h-3.5 w-3.5" />
                                        Call
                                    </a>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete?.(lead.id)}
                            >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Property interest tag */}
            {lead.property_interest && (
                <div className="mt-2">
                    <span className="text-xs text-muted-foreground">
                        {lead.property_interest}
                    </span>
                </div>
            )}

            {/* Budget info */}
            {(lead.min_budget || lead.max_budget) && (
                <div className="mt-1 text-xs text-muted-foreground">
                    {lead.min_budget && lead.max_budget
                        ? `$${(lead.min_budget / 1000).toFixed(0)}k – $${(lead.max_budget / 1000).toFixed(0)}k`
                        : lead.max_budget
                            ? `Up to $${(lead.max_budget / 1000).toFixed(0)}k`
                            : `From $${(lead.min_budget! / 1000).toFixed(0)}k`}
                </div>
            )}
        </div>
    );
}
