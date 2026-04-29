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
import { Phone, Loader2, Search, Calendar, ExternalLink } from "lucide-react";
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
    "bg-blue-100 text-blue-600",
    "bg-slate-100 text-slate-600",
    "bg-cyan-100 text-cyan-600",
    "bg-blue-50 text-blue-400",
    "bg-slate-200 text-slate-700",
    "bg-indigo-100 text-indigo-600",
    "bg-cyan-50 text-cyan-500",
    "bg-violet-100 text-violet-600",
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
        <div className="relative bg-card rounded-xl p-6 border border-border transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 group">
            <div className="absolute top-0 right-0 p-3">
                <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()}>
                    <button className="p-1.5 text-muted-foreground/30 hover:text-primary transition-colors">
                        <ExternalLink className="h-4 w-4" />
                    </button>
                </Link>
            </div>

            <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-4 shrink-0 ${avatarColor(lead.full_name)}`}>
                    {getInitials(lead.full_name)}
                </div>

                <h3 className="text-base font-bold text-foreground mb-4 leading-tight line-clamp-1 w-full px-4">
                    {lead.full_name}
                </h3>

                <div className="w-full space-y-2">
                    {lead.phone ? (
                        <a
                            href={`tel:${lead.phone}`}
                            className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-sm font-medium text-muted-foreground truncate">{lead.phone}</span>
                        </a>
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                            <span className="text-sm text-muted-foreground/40 italic">No phone</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {createdAt ?? "—"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-5">
                <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="w-full text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground font-semibold transition-all duration-200"
                            disabled={assigningTo !== null}
                        >
                            {assigningTo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign Agent"}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-64 p-0">
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
