"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import {
    LayoutDashboard,
    Users,
    Building2,
    Settings,
    BarChart3,
    UserCircle2,
    Inbox,
    LogOut,
    Moon,
    Sun,
    Bell,
    type LucideIcon,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    children?: {
        title: string;
        href: string;
        icon: LucideIcon;
    }[];
};

const mainNavItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Follow Ups",
        href: "/follow-ups",
        icon: Bell,
    },
    {
        title: "Leads",
        href: "/leads",
        icon: Users,
        // children: [
        //     { title: "All Leads", href: "/leads", icon: ListFilter },
        // ],
    },
    {
        title: "Projects",
        href: "/projects",
        icon: Building2,
    },
    {
        title: "Settings",
        href: "/settings",
        icon: Settings,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: "New Leads",
        href: "/new-leads",
        icon: Inbox,
    },
    {
        title: "Team",
        href: "/team",
        icon: UserCircle2,
    },
    {
        title: "Analytics",
        href: "/analytics",
        icon: BarChart3,
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [followUpCount, setFollowUpCount] = useState(0);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        let isMounted = true;
        async function loadFollowUps() {
            try {
                const { fetchAllFollowUps } = await import("@/lib/api");
                const response = await fetchAllFollowUps();
                if (!isMounted) return;
                
                if (Array.isArray(response)) {
                    if (response.length > 0 && 'user' in response[0]) {
                        // Admin grouped format
                        const count = response.reduce((acc, group) => acc + group.follow_ups.length, 0);
                        setFollowUpCount(count);
                    } else {
                        // Agent/Manager flat format
                        setFollowUpCount(response.length);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch follow-ups count:", error);
            }
        }

        if (user) {
            loadFollowUps();
            const interval = setInterval(loadFollowUps, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
        
        return () => { isMounted = false; };
    }, [user]);

    function toggleTheme(e: React.MouseEvent<HTMLButtonElement>) {
        const nextTheme = theme === "dark" ? "light" : "dark";

        /*
        // Pin the ripple origin to the centre of the clicked button
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        document.documentElement.style.setProperty("--ripple-x", `${x}px`);
        document.documentElement.style.setProperty("--ripple-y", `${y}px`);

        if (!document.startViewTransition) {
            // Fallback: CSS transition on <html> handles the fade
            setTheme(nextTheme);
            return;
        }

        const originalTransition = document.documentElement.style.transition;
        document.documentElement.style.transition = "none";

        const transition = document.startViewTransition(() => {
            document.documentElement.classList.remove("light", "dark");
            document.documentElement.classList.add(nextTheme);
            document.documentElement.style.colorScheme = nextTheme;

            flushSync(() => {
                setTheme(nextTheme);
            });
        });

        if (transition && transition.finished) {
            transition.finished.finally(() => {
                document.documentElement.style.transition = originalTransition;
            });
        }
        */

        setTheme(nextTheme);
    }

    const initials = user
        ? `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`
        : "?";

    function handleLogout() {
        logout();
        router.replace("/login");
    }

    return (
        <Sidebar>
            {/* Header */}
            <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                        P
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-sidebar-foreground">PropFlow</div>
                        <div className="text-xs text-muted-foreground">Real Estate CRM</div>
                    </div>
                </div>
            </SidebarHeader>

            {/* Content */}
            <SidebarContent>
                {/* Main Navigation */}
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainNavItems.map((item) => {
                                if (item.title === "Dashboard" && user?.role === "agent") return null;
                                return item.children ? (
                                    <Collapsible
                                        key={item.title}
                                        defaultOpen={pathname.startsWith(item.href)}
                                        className="group/collapsible"
                                    >
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton
                                                    isActive={pathname.startsWith(item.href)}
                                                    tooltip={item.title}
                                                >
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.title}</span>
                                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {item.children.map((child) => (
                                                        <SidebarMenuSubItem key={child.title}>
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                isActive={pathname === child.href}
                                                            >
                                                                <Link href={child.href}>
                                                                    <child.icon className="h-3.5 w-3.5" />
                                                                    <span>{child.title}</span>
                                                                </Link>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>
                                ) : (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === item.href}
                                            tooltip={item.title}
                                        >
                                            <Link href={item.href} className="flex flex-1 items-center">
                                                <item.icon className="h-4 w-4 mr-2" />
                                                <span>{item.title}</span>
                                                {item.title === "Follow Ups" && followUpCount > 0 && (
                                                    <span className="ml-auto bg-accent-foreground/20 text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center min-w-4 h-4 leading-none">
                                                        {followUpCount}
                                                    </span>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Admin Section */}
                {user?.role === "admin" && (
                    <SidebarGroup>
                        <SidebarGroupLabel className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                            Admin
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {adminNavItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === item.href}
                                            tooltip={item.title}
                                        >
                                            <Link href={item.href}>
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                            onClick={toggleTheme}
                        >
                            {mounted && theme === "dark" ? (
                                <Sun className="h-4 w-4" />
                            ) : (
                                <Moon className="h-4 w-4" />
                            )}
                            <span>{mounted && theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            className="h-auto py-2"
                            tooltip="Sign out"
                            onClick={handleLogout}
                        >
                            <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-xs font-medium truncate">
                                    {user?.full_name ?? user?.email ?? "User"}
                                </span>
                                <span className="text-xs text-muted-foreground capitalize">
                                    {user?.role ?? ""}
                                </span>
                            </div>
                            <LogOut className="ml-auto h-4 w-4 text-muted-foreground shrink-0" />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
