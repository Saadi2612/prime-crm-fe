"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
    fetchTeamMembers,
    inviteUser,
    fetchPendingInvitations,
    fetchBlockedUsers,
    fetchUnavailableUsers,
    resendInvitation,
    deleteInvitation,
    updateUserAvailability,
    blockUser,
    unblockUser,
    deleteUser,
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
import { Mail, Plus, Shield, UserCircle2, Loader2, AlertTriangle, RefreshCw, Clock, Trash2, Send, Users, Ban } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    const router = useRouter();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<TeamMember[]>([]);
    const [unavailableUsers, setUnavailableUsers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Invite Modal State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("agent");
    const [phone, setPhone] = useState("");
    const [isInviting, startTransition] = useTransition();

    const isAdmin = user?.role === "admin";
    const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

    const loadData = () => {
        setIsLoading(true);
        setError(null);
        const requests: Promise<unknown>[] = [fetchTeamMembers(), fetchPendingInvitations()];
        if (isAdmin) requests.push(fetchBlockedUsers());
        if (isAdminOrManager) requests.push(fetchUnavailableUsers());

        Promise.all(requests)
            .then((results) => {
                setMembers(results[0] as TeamMember[]);
                setPendingInvites(results[1] as PendingInvitation[]);
                if (isAdmin) setBlockedUsers(results[2] as TeamMember[]);
                if (isAdminOrManager) setUnavailableUsers(results[isAdmin ? 3 : 2] as TeamMember[]);
            })
            .catch((e) => setError(e instanceof Error ? e.message : "Failed to load team data"))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        const requests: Promise<unknown>[] = [fetchTeamMembers(), fetchPendingInvitations()];
        if (isAdmin) requests.push(fetchBlockedUsers());
        if (isAdminOrManager) requests.push(fetchUnavailableUsers());

        Promise.all(requests)
            .then((results) => {
                setMembers(results[0] as TeamMember[]);
                setPendingInvites(results[1] as PendingInvitation[]);
                if (isAdmin) setBlockedUsers(results[2] as TeamMember[]);
                if (isAdminOrManager) setUnavailableUsers(results[isAdmin ? 3 : 2] as TeamMember[]);
            })
            .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load team data"))
            .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to send invitation.");
            }
        });
    };

    const canInvite = isAdminOrManager;
    const canToggleAvailability = isAdminOrManager;

    const handleAvailabilityToggle = async (memberId: string, isAvailable: boolean) => {
        // Optimistic update
        setMembers((prev) =>
            prev.map((m) => m.id === memberId ? { ...m, is_available_for_assignment: isAvailable } : m)
        );
        try {
            await updateUserAvailability(memberId, isAvailable);
        } catch (err) {
            // Revert on error
            setMembers((prev) =>
                prev.map((m) => m.id === memberId ? { ...m, is_available_for_assignment: !isAvailable } : m)
            );
            toast.error(err instanceof Error ? err.message : "Failed to update availability.");
        }
    };

    const handleBlockUser = async (memberId: string) => {
        try {
            await blockUser(memberId);
            toast.success("User blocked. They can no longer log in.");
            loadData();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to block user.");
        }
    };

    const handleUnblockUser = async (memberId: string) => {
        try {
            await unblockUser(memberId);
            toast.success("User unblocked. They can log in again.");
            loadData();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to unblock user.");
        }
    };

    const handleDeleteUser = async (memberId: string) => {
        try {
            await deleteUser(memberId);
            toast.success("User permanently deleted.");
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete user.");
        }
    };

    const handleResend = async (id: string) => {
        try {
            const res = await resendInvitation(id);
            toast.success(res.detail || "Invitation resent.");
            loadData();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to resend invitation.");
        }
    };

    const handleDeleteInvite = async (id: string) => {
        try {
            await deleteInvitation(id);
            toast.success("Pending invitation deleted.");
            loadData();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete invitation.");
        }
    };

    return (
        <div className="flex flex-col h-full w-full px-8 py-7">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Users className="h-6 w-6" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-4 w-40 mt-1 ml-14" />
                    ) : (
                        <p className="text-sm text-muted-foreground mt-0.5 ml-14">
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
            <Tabs defaultValue="active" className="w-full pb-7">
                <TabsList className="mb-4">
                    <TabsTrigger value="active">
                        Active Members ({members.length})
                    </TabsTrigger>
                    {canInvite && (
                        <TabsTrigger value="pending">
                            Pending Invitations {pendingInvites.length > 0 && `(${pendingInvites.length})`}
                        </TabsTrigger>
                    )}
                    {isAdminOrManager && (
                        <TabsTrigger value="unavailable">
                            Unavailable {unavailableUsers.length > 0 && `(${unavailableUsers.length})`}
                        </TabsTrigger>
                    )}
                    {isAdmin && (
                        <TabsTrigger value="blocked">
                            Blocked {blockedUsers.length > 0 && `(${blockedUsers.length})`}
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
                        <TooltipProvider>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    onClick={() => router.push(`/team/${member.id}`)}
                                    className="group rounded-xl border border-border bg-card p-6 shadow-sm hover:border-foreground/20 hover:shadow-md transition-all flex flex-col cursor-pointer"
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

                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                        <Mail className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{member.email}</span>
                                    </div>

                                    {/* Availability row — visible for all non-admin members */}
                                    {member.role.toLowerCase() !== "admin" && (
                                        <div
                                            className="flex items-center justify-between mb-4 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full shrink-0 ${member.is_available_for_assignment !== false ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                                                <span className="text-xs font-medium text-foreground">
                                                    {member.is_available_for_assignment !== false ? "Available" : "Unavailable"}
                                                </span>
                                            </div>
                                            {canToggleAvailability && (
                                                <Switch
                                                className="cursor-pointer"
                                                    checked={member.is_available_for_assignment !== false}
                                                    onCheckedChange={(v) => handleAvailabilityToggle(member.id, v)}
                                                />
                                            )}
                                        </div>
                                    )}

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
                                                {member.lead_stats?.qualified ?? 0}
                                            </div>
                                            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                                                Qualified
                                            </div>
                                        </div>
                                    </div>

                                    {/* Admin actions — not shown for self */}
                                    {user?.role === "admin" && user?.email !== member.email && (
                                        <div
                                            className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* Block / Unblock */}
                                            {member.is_active === false ? (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 h-8 gap-1.5 text-xs text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                                        >
                                                            <Ban className="h-3.5 w-3.5" />
                                                            Unblock
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Unblock {member.full_name || member.email}?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Their account will be restored and they will be able to log in again.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleUnblockUser(member.id)}
                                                                className="bg-green-600 text-white hover:bg-green-700"
                                                            >
                                                                Unblock User
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            ) : (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 h-8 gap-1.5 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                                                        >
                                                            <Ban className="h-3.5 w-3.5" />
                                                            Block
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Block {member.full_name || member.email}?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Their account will be deactivated immediately. They won&apos;t be able to log in until unblocked.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleBlockUser(member.id)}
                                                                className="bg-amber-600 text-white hover:bg-amber-700"
                                                            >
                                                                Block User
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}

                                            {/* Delete */}
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 h-8 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Delete
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete {member.full_name || member.email}?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This permanently deletes the user and all their data. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDeleteUser(member.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Delete Permanently
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        </TooltipProvider>
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

                {isAdminOrManager && (
                    <TabsContent value="unavailable" className="mt-0">
                        {unavailableUsers.length === 0 ? (
                            <div className="rounded-xl border border-border bg-card py-16 text-center flex flex-col items-center shadow-sm">
                                <UserCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <p className="text-foreground font-medium">No unavailable members</p>
                                <p className="text-muted-foreground text-sm mt-1">All active members are available for assignment.</p>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                                <div className="divide-y divide-border">
                                    {unavailableUsers.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/team/${member.id}`)}
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(member.full_name)}`}>
                                                    {initials(member.full_name || member.email)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-foreground truncate">{member.full_name || "Unnamed User"}</div>
                                                    <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                                                </div>
                                            </div>
                                            {canToggleAvailability && (
                                                <div
                                                    className="flex items-center gap-2 shrink-0 ml-14 sm:ml-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <span className="text-xs text-muted-foreground">Mark available</span>
                                                    <Switch
                                                        checked={false}
                                                        onCheckedChange={(v) => handleAvailabilityToggle(member.id, v)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                )}

                {isAdmin && (
                    <TabsContent value="blocked" className="mt-0">
                        {blockedUsers.length === 0 ? (
                            <div className="rounded-xl border border-border bg-card py-16 text-center flex flex-col items-center shadow-sm">
                                <Ban className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <p className="text-foreground font-medium">No blocked users</p>
                                <p className="text-muted-foreground text-sm mt-1">All users have active accounts.</p>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                                <div className="divide-y divide-border">
                                    {blockedUsers.map((member) => (
                                        <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 opacity-50 ${avatarColor(member.full_name)}`}>
                                                    {initials(member.full_name || member.email)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                                                        {member.full_name || "Unnamed User"}
                                                        <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                            Blocked
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-14 sm:ml-0">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700">
                                                            <Ban className="h-3.5 w-3.5" />
                                                            Unblock
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Unblock {member.full_name || member.email}?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Their account will be restored and they will be able to log in again.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleUnblockUser(member.id)}
                                                                className="bg-green-600 text-white hover:bg-green-700"
                                                            >
                                                                Unblock User
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Delete
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete {member.full_name || member.email}?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This permanently deletes the user and all their data. This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(member.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete Permanently
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
