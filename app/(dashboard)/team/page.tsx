"use client";

import { useEffect, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import {
    fetchTeamMembers,
    inviteUser,
    fetchPendingInvitations,
    resendInvitation,
    deleteInvitation,
    type TeamMember,
    type PendingInvitation,
} from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Mail, Plus, Shield, UserCircle2, Loader2, AlertTriangle, RefreshCw, Clock, Trash2, Send, ChevronRight } from "lucide-react";
import Link from "next/link";

// Avatar colours per name hash
const AVATAR_COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-yellow-100 text-yellow-700",
    "bg-cyan-100 text-cyan-700",
];

function avatarColor(name: string) {
    if (!name) return AVATAR_COLORS[0];
    const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string) {
    if (!name || name.trim() === "") return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function TeamPage() {
    const { user } = useAuth();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Invite Modal State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("agent");
    const [phone, setPhone] = useState("");
    const [isInviting, startTransition] = useTransition();

    const loadData = () => {
        setIsLoading(true);
        setError(null);
        Promise.all([fetchTeamMembers(), fetchPendingInvitations()])
            .then(([membersData, pendingData]) => {
                setMembers(membersData);
                setPendingInvites(pendingData);
            })
            .catch((e) => setError(e.message))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();

        startTransition(async () => {
            try {
                const res = await inviteUser({ email, role, phone_number: phone });
                toast.success(res.detail || "Invitation sent successfully.");
                setIsDialogOpen(false);
                setEmail("");
                setPhone("");
                setRole("agent");
                loadData(); // Refresh the lists after successful invite
            } catch (err: any) {
                toast.error(err.message || "Failed to send invitation.");
            }
        });
    };

    const canInvite = user?.role === "admin" || user?.role === "manager";

    const handleResend = async (id: string) => {
        try {
            const res = await resendInvitation(id);
            toast.success(res.detail || "Invitation resent.");
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to resend invitation.");
        }
    };

    const handleDeleteInvite = async (id: string) => {
        try {
            await deleteInvitation(id);
            toast.success("Pending invitation deleted.");
            loadData();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete invitation.");
        }
    };

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
                    {isLoading ? (
                        <Skeleton className="h-4 w-40 mt-1" />
                    ) : (
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {members.length} team member{members.length !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>

                {canInvite && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-2 shrink-0">
                                <Plus className="h-4 w-4" />
                                Invite User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Invite New User</DialogTitle>
                                <DialogDescription>
                                    Send an invitation email to add a new member to the team.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleInvite} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="colleague@example.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isInviting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                        value={role}
                                        onValueChange={setRole}
                                        disabled={isInviting}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {user?.role === "admin" && (
                                                <SelectItem value="manager">Manager</SelectItem>
                                            )}
                                            <SelectItem value="agent">Agent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone number (Optional)</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+1 (555) 000-0000"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        disabled={isInviting}
                                    />
                                </div>
                                <div className="pt-4 flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                        disabled={isInviting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isInviting}>
                                        {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isInviting ? "Sending Invite…" : "Send Invite"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {error && (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 mb-6">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-destructive">Failed to load team members</p>
                        <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={loadData}
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                    </Button>
                </div>
            )}

            {/* Tabbed View for Members and Pending Invitations */}
            <Tabs defaultValue="active" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="active">
                        Active Members ({members.length})
                    </TabsTrigger>
                    {canInvite && (
                        <TabsTrigger value="pending">
                            Pending Invitations {pendingInvites.length > 0 && `(${pendingInvites.length})`}
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="active" className="mt-0">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Skeleton className="h-14 w-14 rounded-xl" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-4 w-48 mb-6" />
                                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                                        <div className="space-y-1 text-center">
                                            <Skeleton className="h-6 w-8 mx-auto" />
                                            <Skeleton className="h-3 w-12 mx-auto" />
                                        </div>
                                        <div className="space-y-1 text-center">
                                            <Skeleton className="h-6 w-8 mx-auto" />
                                            <Skeleton className="h-3 w-12 mx-auto" />
                                        </div>
                                        <div className="space-y-1 text-center">
                                            <Skeleton className="h-6 w-8 mx-auto" />
                                            <Skeleton className="h-3 w-12 mx-auto" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : members.length === 0 ? (
                        <div className="rounded-xl border border-border bg-card py-16 text-center flex flex-col items-center shadow-sm">
                            <UserCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-foreground font-medium">No team members found</p>
                            <p className="text-muted-foreground text-sm mt-1">
                                {canInvite ? "Invite your first team member to get started." : "You are the only member."}
                            </p>
                            {canInvite && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-6 gap-2"
                                    onClick={() => setIsDialogOpen(true)}
                                >
                                    <Plus className="h-4 w-4" />
                                    Invite User
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {members.map((member) => (
                                <Link
                                    key={member.id}
                                    href={`/team/${member.id}`}
                                    className="group rounded-xl border border-border bg-card p-6 shadow-sm hover:border-foreground/20 hover:shadow-md transition-all flex flex-col"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`h-14 w-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${avatarColor(member.full_name)}`}>
                                            {initials(member.full_name || member.email)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-base font-semibold text-foreground truncate">
                                                {member.full_name || "Unnamed User"}
                                                {user?.email === member.email && (
                                                    <span className="ml-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-0.5 capitalize flex items-center gap-1.5">
                                                {member.role === 'admin' && <Shield className="h-3.5 w-3.5" />}
                                                {member.role === 'manager' && <Shield className="h-3.5 w-3.5" />}
                                                {member.role === 'agent' && <UserCircle2 className="h-3.5 w-3.5" />}
                                                {member.role}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                                        <Mail className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{member.email}</span>
                                    </div>

                                    <div className="mt-auto grid grid-cols-3 gap-2 pt-4 border-t border-border/50">
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-foreground">
                                                {member.lead_stats?.total ?? 0}
                                            </div>
                                            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                                Total
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-foreground">
                                                {member.lead_stats?.active ?? 0}
                                            </div>
                                            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                                Active
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-foreground">
                                                {member.lead_stats?.won ?? 0}
                                            </div>
                                            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                                Won
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {canInvite && (
                    <TabsContent value="pending" className="mt-0">
                        {pendingInvites.length === 0 ? (
                            <div className="py-16 text-center flex flex-col items-center border border-border rounded-xl bg-card shadow-sm">
                                <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <p className="text-foreground font-medium">No pending invitations</p>
                                <p className="text-muted-foreground text-sm mt-1">
                                    All invited users have joined the team.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-6 gap-2"
                                    onClick={() => setIsDialogOpen(true)}
                                >
                                    <Plus className="h-4 w-4" />
                                    Invite User
                                </Button>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                                <div className="divide-y divide-border">
                                    {pendingInvites.map((invite) => (
                                        <div
                                            key={invite.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <Avatar className="h-10 w-10 shrink-0 border border-border/50 border-dashed opacity-70">
                                                    <AvatarFallback className={`text-sm font-semibold bg-muted text-muted-foreground`}>
                                                        {initials(invite.email)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                                                        {invite.email}
                                                        {invite.is_expired && (
                                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                                                                Expired
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1.5 capitalize">
                                                            {invite.role === 'admin' && <Shield className="h-3 w-3" />}
                                                            {invite.role === 'manager' && <Shield className="h-3 w-3" />}
                                                            {invite.role === 'agent' && <UserCircle2 className="h-3 w-3" />}
                                                            {invite.role}
                                                        </div>
                                                        <span className="text-muted-foreground/30">•</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="h-3 w-3" />
                                                            Sent {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 ml-14 sm:ml-0">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 gap-1.5 text-xs"
                                                    onClick={() => handleResend(invite.id)}
                                                >
                                                    <Send className="h-3 w-3" />
                                                    Resend
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="sr-only">Delete</span>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Invitation?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete the pending invitation for <strong>{invite.email}</strong>? This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteInvite(invite.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
