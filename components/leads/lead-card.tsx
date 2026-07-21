"use client";

import { useRouter } from "next/navigation";
import type { Lead } from "@/types/leads";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLink, MoreHorizontal, Phone, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

interface LeadCardProps {
    lead: Lead;
    onEdit?: (lead: Lead) => void;
    onDelete?: (id: string) => void;
    /** Custom assignee node rendered in the top-right slot */
    assigneeNode?: React.ReactNode;
    clickable?: boolean;
}

// Colour palette for initials badges — matches the coloured circles in the screenshot
const AVATAR_PALETTES = [
    { bg: "#DBEAFE", text: "#1D4ED8" }, // blue
    { bg: "#E9D5FF", text: "#7C3AED" }, // purple
    { bg: "#BBF7D0", text: "#15803D" }, // green
    { bg: "#FEF08A", text: "#B45309" }, // yellow
    { bg: "#FECACA", text: "#DC2626" }, // red
    { bg: "#BAE6FD", text: "#0369A1" }, // sky
    { bg: "#FDE68A", text: "#92400E" }, // amber
    { bg: "#FBCFE8", text: "#BE185D" }, // pink
] as const;

export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

export function getAvatarColor(name: string) {
    const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_PALETTES[h % AVATAR_PALETTES.length];
}

export function LeadCard({ lead, onEdit, onDelete, assigneeNode, clickable }: LeadCardProps) {
    const router = useRouter();
    const initials = getInitials(lead.full_name);
    const color = getAvatarColor(lead.full_name);

    const projectName =
        lead.project && typeof lead.project === "object" ? lead.project.name : null;

    return (
        <div
            className={`
                group bg-white rounded-xl p-4
                shadow-[0_1px_6px_rgba(15,23,42,0.07)]
                hover:shadow-[0_4px_16px_rgba(15,23,42,0.12)]
                transition-shadow duration-200
                ${clickable ? "cursor-pointer" : ""}
            `}
            onClick={clickable ? () => router.push(`/leads/${lead.id}`) : undefined}
        >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2 mb-3">
                {/* Lead initials circle */}
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none"
                    style={{ background: color.bg, color: color.text }}
                >
                    {initials}
                </div>

                {/* Assignee avatar slot (dark circle avatar on right) */}
                <div className="flex items-center gap-1 shrink-0">
                    {assigneeNode ?? null}

                    {/* Context menu — appears on hover */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="w-6 h-6 flex items-center justify-center rounded-full text-[#CBD5E1] hover:text-[#64748B] opacity-0 group-hover:opacity-100 transition-all duration-150"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-44"
                            onClick={(e) => e.stopPropagation()}
                        >
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

            {/* Name */}
            <p className="text-[14px] font-bold text-[#0F172A] leading-snug mb-0.5">
                {lead.full_name}
            </p>

            {/* Phone */}
            {lead.phone && (
                <p className="text-[12px] text-[#94A3B8] leading-snug mb-2.5">
                    {lead.phone}
                </p>
            )}

            {/* Chips row */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {lead.leadgen_id && (
                    <span
                        className="inline-block text-[9px] font-bold uppercase tracking-[0.08em] rounded-md px-2 py-1"
                        style={{ color: "#1877F2", backgroundColor: "#E7F0FE" }}
                        title="Sourced from Meta lead ads"
                    >
                        via Meta
                    </span>
                )}
                {lead.is_queued && (
                    <span
                        className="inline-block text-[9px] font-bold uppercase tracking-[0.08em] rounded-md px-2 py-1"
                        style={{ color: "#B45309", backgroundColor: "#FEF3C7" }}
                        title="Queued for distribution at next office open"
                    >
                        Queued
                    </span>
                )}
                {projectName && (
                    <span className="inline-block text-[9px] font-bold uppercase tracking-[0.08em] text-[#94A3B8] bg-[#F1F5F9] rounded-md px-2 py-1">
                        {projectName}
                    </span>
                )}
            </div>
        </div>
    );
}
