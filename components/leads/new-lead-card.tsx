"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lead } from "@/types/leads";
import type { TeamMember } from "@/lib/api";
import { transferLead } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    ExternalLink,
    Phone,
    User,
    Loader2,
    Search,
    Calendar,
    DollarSign,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NewLeadCardProps {
    lead: Lead;
    teamMembers: TeamMember[];
    onAssigned: (leadId: string) => void;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

const AVATAR_COLORS = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
];

function avatarColor(name: string) {
    const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function NewLeadCard({ lead, teamMembers, onAssigned }: NewLeadCardProps) {
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
            await transferLead(lead.id, member.id, "Assigned from New Leads");
            toast.success(`Assigned to ${member.full_name}`);
            setOpen(false);
            onAssigned(lead.id);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to assign lead");
        } finally {
            setAssigningTo(null);
        }
    }

    const createdAt = lead.created_at
        ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })
        : null;

    return (
        <div className="group relative bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-foreground/10 transition-all flex flex-col gap-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Lead initials avatar */}
                    <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0 ${avatarColor(lead.full_name)}`}
                    >
                        {getInitials(lead.full_name)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate leading-tight">
                            {lead.full_name}
                        </p>
                        {lead.phone && (
                            <a
                                href={`tel:${lead.phone}`}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Phone className="h-3 w-3 shrink-0" />
                                <span className="truncate">{lead.phone}</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Quick open */}
                <Link href={`/leads/${lead.id}`} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                </Link>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
                {lead.property_interest && (
                    <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {lead.property_interest}
                    </span>
                )}
                {(lead.min_budget || lead.max_budget) && (
                    <span className="flex items-center gap-1 text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        <DollarSign className="h-3 w-3" />
                        {lead.min_budget && lead.max_budget
                            ? `${(lead.min_budget / 1000).toFixed(0)}k – ${(lead.max_budget / 1000).toFixed(0)}k`
                            : lead.max_budget
                            ? `Up to ${(lead.max_budget / 1000).toFixed(0)}k`
                            : `From ${(lead.min_budget! / 1000).toFixed(0)}k`}
                    </span>
                )}
            </div>

            {/* Footer — timestamp + assign avatar */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/60">
                {createdAt ? (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {createdAt}
                    </span>
                ) : <span />}

                {/* Unassigned avatar — opens dropdown to pick a user */}
                <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="h-8 w-8 rounded-full bg-muted border-2 border-dashed border-muted-foreground/40 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shrink-0"
                            title="Assign to user"
                            aria-label="Assign lead to a user"
                        >
                            <User className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 p-0">
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
                                                {getInitials(member.full_name || member.email)}
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
            </div>
        </div>
    );
}
