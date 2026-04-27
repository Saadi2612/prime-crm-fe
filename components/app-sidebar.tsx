"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useEffect, useState } from "react";
import {
    LayoutDashboard,
    Users,
    Building2,
    Settings,
    BarChart3,
    UserCircle2,
    Inbox,
    LogOut,
    Bell,
    Plus,
    PanelLeftClose,
    PanelLeftOpen,
    Newspaper,
    IdCard,
    type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ── Nav item type ──────────────────────────────────────────────────
type NavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    badge?: number;
    adminOnly?: boolean;
};

const mainNavItems: NavItem[] = [
    { title: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
    { title: "Follow Ups", href: "/follow-ups", icon: Bell },
    { title: "Leads",      href: "/leads",       icon: Users },
    { title: "Projects",   href: "/projects",    icon: Building2 },
    { title: "Settings",   href: "/settings",    icon: Settings },
];

const adminNavItems: NavItem[] = [
    { title: "New Leads",  href: "/new-leads",  icon: Newspaper,    adminOnly: true },
    { title: "Team",       href: "/team",        icon: IdCard,       adminOnly: true },
    { title: "Analytics",  href: "/analytics",   icon: BarChart3,    adminOnly: true },
];

// ── Logo icon (grid of squares) ────────────────────────────────────
function PropFlowLogo() {
    return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F52BA] shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2"  y="2"  width="6" height="6" rx="1.5" fill="white" />
                <rect x="10" y="2"  width="6" height="6" rx="1.5" fill="white" opacity="0.6" />
                <rect x="2"  y="10" width="6" height="6" rx="1.5" fill="white" opacity="0.6" />
                <rect x="10" y="10" width="6" height="6" rx="1.5" fill="white" opacity="0.3" />
            </svg>
        </div>
    );
}

// ── Single nav row ─────────────────────────────────────────────────
function NavRow({
    item,
    active,
    badge,
    collapsed,
}: {
    item: NavItem;
    active: boolean;
    badge?: number;
    collapsed?: boolean;
}) {
    return (
        <Link
            href={item.href}
            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 group relative
                ${active
                    ? "bg-[#162743] text-white"
                    : "text-[#8BA3C1] hover:text-white hover:bg-white/5"
                }
            `}
            title={collapsed ? item.title : undefined}
        >
            <div className={`flex items-center justify-center shrink-0 ${collapsed ? "w-full" : ""}`}>
                <item.icon
                    className={`w-4 h-4 ${active ? "text-white" : "text-[#8BA3C1] group-hover:text-white"}`}
                />
            </div>
            
            {!collapsed && (
                <span className="flex-1 truncate">{item.title}</span>
            )}

            {badge !== undefined && badge > 0 && (
                <span
                    className={`
                        min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold
                        flex items-center justify-center leading-none absolute right-3
                        ${active ? "bg-[#0F52BA] text-white" : "bg-[#0F52BA] text-white"}
                        ${collapsed ? "top-1 right-1 w-4 h-4 min-w-0! px-0! text-[8px]" : ""}
                    `}
                >
                    {badge}
                </span>
            )}
        </Link>
    );
}

// ── Main component ─────────────────────────────────────────────────
export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [followUpCount, setFollowUpCount] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        let isMounted = true;
        async function loadFollowUps() {
            try {
                const { fetchAllFollowUps } = await import("@/lib/api");
                const response = await fetchAllFollowUps();
                if (!isMounted) return;
                if (Array.isArray(response)) {
                    if (response.length > 0 && "user" in response[0]) {
                        const count = response.reduce((acc: number, group: { follow_ups: unknown[] }) => acc + group.follow_ups.length, 0);
                        setFollowUpCount(count);
                    } else {
                        setFollowUpCount(response.length);
                    }
                }
            } catch {
                // silently fail
            }
        }
        if (user) {
            loadFollowUps();
            const interval = setInterval(loadFollowUps, 5 * 60 * 1000);
            return () => { isMounted = false; clearInterval(interval); };
        }
        return () => { isMounted = false; };
    }, [user]);

    function handleLogout() {
        logout();
        router.replace("/login");
    }

    const initials = user
        ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
        : "?";

    const roleLabel = user?.role === "admin"
        ? "Admin Account"
        : user?.role === "manager"
        ? "Manager"
        : "Agent";

    const isAdmin = user?.role === "admin";

    return (
        <aside
            className={`flex flex-col shrink-0 h-full transition-all duration-300 ease-in-out relative border-r border-[#17253B]`}
            style={{ background: "#0B1525", width: isCollapsed ? "72px" : "220px" }}
        >
            {/* Toggle Collapse Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-6 bg-[#162743] hover:bg-[#1E3355] text-[#8BA3C1] p-1 rounded-full border border-[#17253B] z-10 transition-colors shadow-md"
            >
                {isCollapsed ? <PanelLeftOpen className="w-3 h-3" /> : <PanelLeftClose className="w-3 h-3" />}
            </button>

            {/* ── Logo ───────────────────────────────────────────── */}
            <div className={`px-4 pt-6 pb-6 flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                <PropFlowLogo />
                {!isCollapsed && (
                    <div className="flex-1 overflow-hidden transition-all duration-300 opacity-100">
                        <div className="text-white text-base font-bold leading-tight tracking-tight">
                            PropFlow
                        </div>
                        <div className="text-[#5B7A9D] text-[9px] font-semibold uppercase tracking-widest leading-tight whitespace-nowrap">
                            Real Estate CRM
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add Lead CTA ───────────────────────────────────── */}
            <div className="px-3 pb-6">
                <button
                    onClick={() => router.push("/leads?action=new")}
                    className={`w-full flex items-center justify-center gap-2 bg-[#0F52BA] hover:bg-[#1D4ED8] text-white text-sm font-medium py-2.5 rounded-xl transition-all duration-150 active:scale-[0.98] ${isCollapsed ? "px-0" : "px-4"}`}
                    title={isCollapsed ? "Add Lead" : undefined}
                >
                    <Plus className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">Add Lead</span>}
                </button>
            </div>

            {/* ── Main Nav ───────────────────────────────────────── */}
            <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
                {mainNavItems.map((item) => {
                    if (item.title === "Dashboard" && user?.role === "agent") return null;
                    const active = item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);
                    return (
                        <NavRow
                            key={item.title}
                            item={item}
                            active={active}
                            badge={item.title === "Follow Ups" ? followUpCount : undefined}
                            collapsed={isCollapsed}
                        />
                    );
                })}

                {/* Spacer */}
                <div className="flex-1" />

                {/* ── Admin Nav ──────────────────────────────────── */}
                {isAdmin && (
                    <>
                        <div className="px-5 py-4">
                            <div className="w-full h-px bg-[#182B46]" />
                        </div>
                        <div className="flex flex-col gap-0.5 pb-4">
                            {adminNavItems.map((item) => {
                                const active = pathname.startsWith(item.href);
                                return (
                                    <NavRow
                                        key={item.title}
                                        item={item}
                                        active={active}
                                        collapsed={isCollapsed}
                                    />
                                );
                            })}
                        </div>
                    </>
                )}
            </nav>

            {/* ── User Footer ────────────────────────────────────── */}
            <div className="px-3 pb-5 pt-2">
                <div
                    onClick={handleLogout}
                    className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer group
                        bg-[#1C283B] hover:bg-[#25354D] text-left border border-[#2B3B53] hover:border-[#384B68] shadow-sm
                    `}
                    title={isCollapsed ? "Logout" : undefined}
                >
                    <Avatar className={`h-8 w-8 shrink-0 ${isCollapsed ? "mx-auto" : ""}`}>
                        <AvatarFallback className="text-xs font-bold bg-[#2A4164] text-[#8BA3C1] border border-[#162743]">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    
                    {!isCollapsed && (
                        <>
                            <div className="flex flex-col items-start min-w-0 flex-1">
                                <span className="text-[13px] font-medium text-white truncate leading-tight w-full">
                                    {user?.full_name ?? user?.email ?? "User"}
                                </span>
                                <span className="text-[11px] text-[#8BA3C1] leading-tight capitalize truncate w-full mt-0.5">
                                    {roleLabel}
                                </span>
                            </div>
                            <LogOut className="w-4 h-4 text-[#5B7A9D] group-hover:text-white shrink-0 ml-1 transition-colors" />
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}
