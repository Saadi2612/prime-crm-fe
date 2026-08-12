"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { usePathname, useRouter } from "next/navigation";
import { Search, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { getMyAvailability, setMyAvailability } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Switch } from "@/components/ui/switch";
import { NotificationProvider } from "@/context/notification-context";
import { NotificationBell } from "@/components/notifications/notification-bell";

// Per-route tab configuration
const routeTabs: Record<string, { label: string; href: string }[]> = {
    "/dashboard": [
        { label: "Overview", href: "/dashboard" },
        // { label: "Pipeline", href: "/dashboard/pipeline" },
        { label: "Reports", href: "/dashboard/reports" },
    ],
    // "/leads": [
    //     { label: "Kanban", href: "/leads" },
    //     { label: "List", href: "/leads" },
    // ],
    // "/projects": [
    //     { label: "Overview", href: "/projects" },
    //     { label: "Pipeline", href: "/projects/pipeline" },
    //     { label: "Reports", href: "/projects/reports" },
    // ],
    "/settings": [
        { label: "Integrations", href: "/settings/integrations" },
        { label: "Leads", href: "/settings/leads" },
        { label: "Security", href: "/settings/security" },
    ],
};

function getTabsForPath(pathname: string) {
    for (const [prefix, tabs] of Object.entries(routeTabs)) {
        if (pathname === prefix || pathname.startsWith(prefix + "/")) {
            return tabs;
        }
    }
    return null;
}

function AvailabilityToggle() {
    const { user } = useAuth();
    const [available, setAvailable] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getMyAvailability()
            .then((data) => setAvailable(data.is_available_for_assignment))
            .catch(() => {});
    }, []);

    async function toggle(next: boolean) {
        setLoading(true);
        try {
            const data = await setMyAvailability(next);
            setAvailable(data.is_available_for_assignment);
        } catch {
            setAvailable(!next);
        } finally {
            setLoading(false);
        }
    }

    if (user?.role === "admin" || available === null) return null;

    return (
        <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${available ? "text-green-700" : "text-slate-400"}`}>
                {available ? "Available" : "Unavailable"}
            </span>
            <Switch
                checked={available}
                onCheckedChange={toggle}
                disabled={loading}
                className="data-[state=checked]:bg-green-500"
            />
        </div>
    );
}

function TopHeader({ pathname, router }: { pathname: string; router: ReturnType<typeof useRouter> }) {
    const tabs = getTabsForPath(pathname);

    return (
        <header className="h-14 shrink-0 flex items-center gap-4 px-5 bg-white border-b border-[#E8EDF2]">
            {/* Search */}
            <div className="flex items-center gap-2 bg-[#F4F6F9] rounded-lg px-3 py-2 w-64 shrink-0">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                <input
                    type="text"
                    placeholder="Search pipeline or leads..."
                    className="bg-transparent text-xs text-[#64748B] placeholder-[#94A3B8] outline-none w-full"
                    readOnly
                />
            </div>

            {/* Tabs */}
            {tabs && (
                <nav className="flex items-center gap-1">
                    {tabs.map((tab) => {
                        const active = pathname === tab.href;
                        return (
                            <button
                                key={tab.href}
                                onClick={() => router.push(tab.href)}
                                className={`
                                    px-3 py-1.5 text-sm font-medium transition-colors duration-150 relative
                                    ${active
                                        ? "text-[#2563EB]"
                                        : "text-[#64748B] hover:text-[#334155]"
                                    }
                                `}
                            >
                                {tab.label}
                                {active && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </nav>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right actions */}
            <div className="flex items-center gap-3">
                <AvailabilityToggle />
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#475569] hover:bg-[#F4F6F9] transition-colors">
                    <HelpCircle className="w-4.5 h-4.5" />
                </button>
                <NotificationBell />
                {/* <button
                    onClick={() => {
                        if (pathname.startsWith("/projects")) {
                            router.push("/projects?action=new");
                        } else {
                            router.push("/leads?action=new");
                        }
                    }}
                    className="flex items-center justify-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium px-4 py-1.5 rounded-md transition-all duration-150"
                >
                    {pathname.startsWith("/projects") ? "+ Add Project" : "Add Lead"}
                </button> */}
            </div>
        </header>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <NotificationProvider>
            <div className="flex h-screen overflow-hidden bg-background">
                {/* Sidebar */}
                <AppSidebar />

                {/* Main area */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <TopHeader pathname={pathname} router={router} />
                    <main className="flex-1 overflow-y-auto overflow-x-hidden">
                        {children}
                    </main>
                </div>
            </div>
        </NotificationProvider>
    );
}
