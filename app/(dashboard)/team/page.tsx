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
    Mail,
    Plus,
    Shield,
    UserCircle2,
    Loader2,
    AlertTriangle,
    RefreshCw,
    Clock,
    Trash2,
    Send,
    Users,
    Ban,
    UserPlus,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";

// ── Avatar color palette ──────────────────────────────────────────────────────

const AVATAR_COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-yellow-100 text-yellow-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
    "bg-sky-100 text-sky-700",
    "bg-violet-100 text-violet-700",
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

type TabKey = "active" | "pending" | "unavailable" | "blocked";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<TeamMember[]>([]);
    const [unavailableUsers, setUnavailableUsers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>("active");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("agent");
    const [phone, setPhone] = useState("");
    const [isInviting, startTransition] = useTransition();

    const isAdmin = user?.role === "admin";
    const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
    const canInvite = isAdminOrManager;
    const canToggleAvailability = isAdminOrManager;

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
        if (authLoading) return;
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
    }, [authLoading]);

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            try {
                const res = await inviteUser({ email, role, phone_number: phone });
                toast.success(res.detail || "Invitation sent successfully.");
                setIsDialogOpen(false);
                setEmail(""); setPhone(""); setRole("agent");
                loadData();
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to send invitation.");
            }
        });
    };

    const handleAvailabilityToggle = async (memberId: string, isAvailable: boolean) => {
        setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, is_available_for_assignment: isAvailable } : m));
        try {
            await updateUserAvailability(memberId, isAvailable);
        } catch (err) {
            setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, is_available_for_assignment: !isAvailable } : m));
            toast.error(err instanceof Error ? err.message : "Failed to update availability.");
        }
    };

    const handleBlockUser = async (memberId: string) => {
        try {
            await blockUser(memberId);
            toast.success("User blocked.");
            loadData();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to block user.");
        }
    };

    const handleUnblockUser = async (memberId: string) => {
        try {
            await unblockUser(memberId);
            toast.success("User unblocked.");
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
            toast.success("Invitation deleted.");
            loadData();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete invitation.");
        }
    };

    // ── Tabs config ───────────────────────────────────────────────────────────
    const allTabs: { key: TabKey; label: string; count?: number; show: boolean }[] = [
        { key: "active", label: "Active Members", count: members.length, show: true },
        { key: "pending", label: "Pending Invitations", count: pendingInvites.length || undefined, show: !!canInvite },
        { key: "unavailable", label: "Unavailable", count: unavailableUsers.length || undefined, show: !!isAdminOrManager },
        { key: "blocked", label: "Blocked", count: blockedUsers.length || undefined, show: !!isAdmin },
    ];
    const tabs = allTabs.filter((t) => t.show);

    // ── Invite dialog ─────────────────────────────────────────────────────────
    const InviteDialog = (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 shrink-0">
                    <UserPlus className="h-4 w-4" />
                    Invite User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                    <DialogDescription>Send an invitation email to add a new member to the team.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input id="email" type="email" placeholder="colleague@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isInviting} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select value={role} onValueChange={setRole} disabled={isInviting}>
                            <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                            <SelectContent>
                                {user?.role === "admin" && <SelectItem value="manager">Manager</SelectItem>}
                                <SelectItem value="agent">Agent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone number (Optional)</Label>
                        <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isInviting} />
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isInviting}>Cancel</Button>
                        <Button type="submit" disabled={isInviting}>
                            {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isInviting ? "Sending…" : "Send Invite"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );

    return (
        <div className="flex-1 min-h-full bg-[#EFF3F8]">
            <div className="p-8 max-w-7xl mx-auto w-full space-y-8">

                {/* ── Page header ───────────────────────────────────────────── */}
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
                            Team Management
                        </h1>
                        <div className="flex items-center gap-2">
                            {isLoading ? (
                                <Skeleton className="h-5 w-36" />
                            ) : (
                                <>
                                    <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs">
                                        {members.length} Active Member{members.length !== 1 ? "s" : ""}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    {canInvite && InviteDialog}
                </div>

                {/* ── Error ─────────────────────────────────────────────────── */}
                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-destructive">Failed to load team members</p>
                            <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0" onClick={loadData}>
                            <RefreshCw className="h-3.5 w-3.5" />
                            Retry
                        </Button>
                    </div>
                )}

                {/* ── Tabs ──────────────────────────────────────────────────── */}
                <div className="border-b border-border">
                    <div className="flex gap-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={[
                                    "pb-4 text-sm font-semibold transition-colors border-b-2 -mb-px",
                                    activeTab === tab.key
                                        ? "text-primary border-primary"
                                        : "text-muted-foreground border-transparent hover:text-foreground",
                                ].join(" ")}
                            >
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className="ml-1.5 font-mono opacity-60">({tab.count})</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Active Members ────────────────────────────────────────── */}
                {activeTab === "active" && (
                    isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="bg-card rounded-[20px] p-6">
                                    <div className="flex items-start justify-between mb-5">
                                        <Skeleton className="h-14 w-14 rounded-2xl" />
                                    </div>
                                    <div className="space-y-2 mb-5">
                                        <Skeleton className="h-5 w-36" />
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-40" />
                                    </div>
                                    <Skeleton className="h-16 w-full rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : members.length === 0 ? (
                        <div className="rounded-[20px] bg-card py-16 text-center flex flex-col items-center shadow-sm">
                            <UserCircle2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                            <p className="text-foreground font-medium">No team members found</p>
                            <p className="text-muted-foreground text-sm mt-1">
                                {canInvite ? "Invite your first team member to get started." : "You are the only member."}
                            </p>
                            {canInvite && (
                                <Button variant="outline" size="sm" className="mt-6 gap-2" onClick={() => setIsDialogOpen(true)}>
                                    <Plus className="h-4 w-4" />
                                    Invite User
                                </Button>
                            )}
                        </div>
                    ) : (
                        <TooltipProvider>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        onClick={() => router.push(`/team/${member.id}`)}
                                        className="bg-card rounded-[20px] p-6 cursor-pointer group flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                                    >
                                        {/* Avatar row */}
                                        <div className="flex items-start justify-between mb-5">
                                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${avatarColor(member.full_name)}`}>
                                                {initials(member.full_name || member.email)}
                                            </div>
                                            {member.is_active === false && (
                                                <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                    Blocked
                                                </span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="mb-5">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="text-base font-bold text-foreground leading-tight">
                                                    {member.full_name || "Unnamed User"}
                                                </h3>
                                                {user?.email === member.email && (
                                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                        You
                                                    </span>
                                                )}
                                                {(member.role === "admin" || member.role === "manager") ? (
                                                    <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                                                ) : (
                                                    <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                                            <p className="text-xs text-muted-foreground/60 font-mono mt-1 truncate">{member.email}</p>
                                        </div>

                                        {/* Availability toggle */}
                                        {member.role.toLowerCase() !== "admin" && (
                                            <div
                                                className="flex items-center justify-between mb-4 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/50"
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

                                        {/* Lead stats */}
                                        <div className="flex justify-between items-center bg-muted/40 rounded-xl p-4 mt-auto">
                                            <div className="text-center flex-1">
                                                <p className="font-mono text-lg font-bold text-foreground">{member.lead_stats?.total ?? 0}</p>
                                                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-0.5">Total</p>
                                            </div>
                                            <div className="w-px h-8 bg-border" />
                                            <div className="text-center flex-1">
                                                <p className="font-mono text-lg font-bold text-foreground">{member.lead_stats?.active ?? 0}</p>
                                                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-0.5">Active</p>
                                            </div>
                                            <div className="w-px h-8 bg-border" />
                                            <div className="text-center flex-1">
                                                <p className="font-mono text-lg font-bold text-primary">{member.lead_stats?.qualified ?? 0}</p>
                                                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-0.5">Qualified</p>
                                            </div>
                                        </div>

                                        {/* Admin actions */}
                                        {isAdmin && user?.email !== member.email && (
                                            <div
                                                className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {member.is_active === false ? (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="flex-1 h-8 gap-1.5 text-xs text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700">
                                                                <Ban className="h-3.5 w-3.5" />
                                                                Unblock
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Unblock {member.full_name || member.email}?</AlertDialogTitle>
                                                                <AlertDialogDescription>Their account will be restored and they will be able to log in again.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleUnblockUser(member.id)} className="bg-green-600 text-white hover:bg-green-700">Unblock User</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                ) : (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="sm" className="flex-1 h-8 gap-1.5 text-xs transition-all duration-300 text-orange-600 bg-orange-100 hover:bg-orange-200 hover:text-orange-600">
                                                                <Ban className="h-3.5 w-3.5" />
                                                                Block
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Block {member.full_name || member.email}?</AlertDialogTitle>
                                                                <AlertDialogDescription>Their account will be deactivated immediately. They won&apos;t be able to log in until unblocked.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleBlockUser(member.id)} className="bg-orange-600 text-white hover:bg-orange-700">Block User</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="sm" className="flex-1 h-8 gap-1.5 text-xs transition-all duration-300 text-red-600 bg-red-100 hover:bg-red-200 hover:text-red-600">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Delete
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete {member.full_name || member.email}?</AlertDialogTitle>
                                                            <AlertDialogDescription>This permanently deletes the user and all their data. This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteUser(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Permanently</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </TooltipProvider>
                    )
                )}

                {/* ── Pending Invitations ───────────────────────────────────── */}
                {activeTab === "pending" && canInvite && (
                    pendingInvites.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/50">
                                <Mail className="h-9 w-9" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">No pending invitations</h3>
                            <p className="text-muted-foreground text-sm mb-8 max-w-sm leading-relaxed">
                                Your team is fully onboarded. When you invite new collaborators, their status will appear here until they accept.
                            </p>
                            <Button variant="outline" className="gap-2" onClick={() => setIsDialogOpen(true)}>
                                <Plus className="h-4 w-4" />
                                Invite User
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-[20px] bg-card overflow-hidden shadow-sm">
                            <div className="divide-y divide-border">
                                {pendingInvites.map((invite) => (
                                    <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <Avatar className="h-10 w-10 shrink-0 border border-dashed border-border opacity-70">
                                                <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
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
                                                        {(invite.role === "admin" || invite.role === "manager") ? <Shield className="h-3 w-3" /> : <UserCircle2 className="h-3 w-3" />}
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
                                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleResend(invite.id)}>
                                                <Send className="h-3 w-3" />
                                                Resend
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Invitation?</AlertDialogTitle>
                                                        <AlertDialogDescription>Are you sure you want to delete the pending invitation for <strong>{invite.email}</strong>?</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteInvite(invite.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}

                {/* ── Unavailable ───────────────────────────────────────────── */}
                {activeTab === "unavailable" && isAdminOrManager && (
                    unavailableUsers.length === 0 ? (
                        <div className="rounded-[20px] bg-card py-16 text-center flex flex-col items-center shadow-sm">
                            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
                            <p className="text-foreground font-medium">No unavailable members</p>
                            <p className="text-muted-foreground text-sm mt-1">All active members are available for assignment.</p>
                        </div>
                    ) : (
                        <div className="rounded-[20px] bg-card overflow-hidden shadow-sm">
                            <div className="divide-y divide-border">
                                {unavailableUsers.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-muted/20 transition-colors cursor-pointer"
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
                                            <div className="flex items-center gap-2 shrink-0 ml-14 sm:ml-0" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-xs text-muted-foreground">Mark available</span>
                                                <Switch checked={false} onCheckedChange={(v) => handleAvailabilityToggle(member.id, v)} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}

                {/* ── Blocked ───────────────────────────────────────────────── */}
                {activeTab === "blocked" && isAdmin && (
                    blockedUsers.length === 0 ? (
                        <div className="rounded-[20px] bg-card py-16 text-center flex flex-col items-center shadow-sm">
                            <Ban className="h-12 w-12 text-muted-foreground/40 mb-4" />
                            <p className="text-foreground font-medium">No blocked users</p>
                            <p className="text-muted-foreground text-sm mt-1">All users have active accounts.</p>
                        </div>
                    ) : (
                        <div className="rounded-[20px] bg-card overflow-hidden shadow-sm">
                            <div className="divide-y divide-border">
                                {blockedUsers.map((member) => (
                                    <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 opacity-50 ${avatarColor(member.full_name)}`}>
                                                {initials(member.full_name || member.email)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                                                    {member.full_name || "Unnamed User"}
                                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Blocked</span>
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
                                                        <AlertDialogDescription>Their account will be restored and they will be able to log in again.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleUnblockUser(member.id)} className="bg-green-600 text-white hover:bg-green-700">Unblock User</AlertDialogAction>
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
                                                        <AlertDialogDescription>This permanently deletes the user and all their data. This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteUser(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Permanently</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}

            </div>
        </div>
    );
}
