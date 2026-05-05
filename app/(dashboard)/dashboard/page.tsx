"use client";

import { useEffect, useState } from "react";
import {
  fetchDashboardStats,
  fetchDashboardChart,
  fetchLeads,
  fetchProjects,
  DashboardStats,
  DashboardChartData,
  Project,
} from "@/lib/api";
import type { Lead } from "@/types/leads";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Users, Zap, ShieldCheck, CalendarDays, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

const chartConfig = {
  leads: {
    label: "Leads",
    color: "#2563EB",
  },
} satisfies ChartConfig;

function StatCard({
  label,
  value,
  icon: Icon,
  pillText,
  pillVariant,
  color = "blue",
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  pillText?: string;
  pillVariant?: "white" | "solid";
  color?: "blue" | "cyan" | "green" | "indigo";
  loading?: boolean;
}) {
  const styles = {
    blue: {
      bg: "bg-[#EFF6FF]",
      text: "text-[#2563EB]",
      pillSolid: "bg-[#2563EB] text-white",
    },
    cyan: {
      bg: "bg-[#F0F9FF]",
      text: "text-[#0284C7]",
      pillSolid: "bg-[#0284C7] text-white",
    },
    green: {
      bg: "bg-[#ECFDF5]",
      text: "text-[#059669]",
      pillSolid: "bg-[#059669] text-white",
    },
    indigo: {
      bg: "bg-[#EEF2FF]",
      text: "text-[#4338CA]",
      pillSolid: "bg-[#4338CA] text-white",
    },
  }[color];

  return (
    <div className={`rounded-xl p-6 flex flex-col transition-transform hover:-translate-y-1 ${styles.bg}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="bg-white p-2 rounded-lg shadow-sm inline-flex items-center justify-center">
          <Icon className={`w-5 h-5 ${styles.text}`} />
        </div>
        {pillText && (
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full ${
              pillVariant === "solid" ? styles.pillSolid : `bg-white ${styles.text}`
            }`}
          >
            {pillText}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-1">
          <div className="h-3 w-20 bg-white/50 rounded animate-pulse" />
          <div className="h-8 w-16 bg-white/50 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-1">
          <p className={`text-[11px] uppercase font-bold tracking-widest ${styles.text}`}>
            {label}
          </p>
          <p className={`text-3xl font-medium font-mono ${styles.text}`}>
            {value}
          </p>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#EFF6FF] rounded-xl p-6 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div className="w-9 h-9 rounded-lg bg-white/60 animate-pulse" />
        <div className="w-10 h-5 rounded-full bg-white/60 animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-20 bg-white/60 rounded animate-pulse" />
        <div className="h-8 w-16 bg-white/60 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<DashboardChartData[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [featuredProject, setFeaturedProject] = useState<Project | null>(null);
  const [days, setDays] = useState<"7" | "30" | "365">("30");
  const [statsLoading, setStatsLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role === "agent") {
      router.replace("/leads");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || user?.role === "agent") return;

    fetchDashboardStats()
      .then(setStats)
      .catch((e) => console.error("Failed to load stats:", e))
      .finally(() => setStatsLoading(false));

    fetchDashboardChart(parseInt(days))
      .then(setChartData)
      .catch((e) => console.error("Failed to load chart:", e));

    fetchLeads({ page_size: 3, is_paginated: false })
      .then((data) => {
        const leads = Array.isArray(data) ? data : (data as { results?: Lead[] }).results ?? [];
        setRecentLeads(leads.slice(0, 3));
      })
      .catch((e) => console.error("Failed to load leads:", e))
      .finally(() => setLeadsLoading(false));

    fetchProjects()
      .then((data) => {
        const projects = Array.isArray(data) ? data : [];
        setFeaturedProject(projects[0] ?? null);
      })
      .catch((e) => console.error("Failed to load projects:", e));
  }, [days, authLoading, user]);

  if (authLoading || user?.role === "agent") {
    return null;
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex-1 min-h-full bg-background pb-12">
      <div className="mx-auto px-8 py-7 space-y-8">

        {/* ── Page header ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <p className="text-[#64748B] text-[13px] mt-1 ml-14">
            Welcome back to PropFlow CRM
          </p>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {statsLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : stats ? (
            <>
              <StatCard label="Total Leads" value={stats.total_leads} icon={Users} color="blue" pillText="+12%" pillVariant="white" loading={false} />
              <StatCard label="Active Leads" value={stats.active_leads} icon={Zap} color="cyan" pillText="+4.5%" pillVariant="white" loading={false} />
              <StatCard label="Qualified Leads" value={stats.qualified_leads} icon={ShieldCheck} color="green" pillText="New" pillVariant="white" loading={false} />
              <StatCard label="Follow-ups Today" value={stats.follow_ups_today} icon={CalendarDays} color="indigo" pillText="Urgent" pillVariant="solid" loading={false} />
            </>
          ) : null}
        </div>

        {/* ── Chart ─────────────────────────────────── */}
        <div className="bg-white rounded-[10px] flex flex-col p-8" style={{ boxShadow: "0 2px 8px rgba(37,99,235,0.04)" }}>
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="text-[17px] font-bold text-[#0F172A]">Total Leads</h2>
              <p className="text-[13px] text-[#94A3B8] mt-1 -tracking-wide">
                Lead generation over the last {days === "7" ? "7 days" : days === "30" ? "30 days" : "year"}
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              {([["Week", "7"], ["Month", "30"], ["Year", "365"]] as const).map(([label, value]) => (
                <button
                  key={label}
                  onClick={() => setDays(value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    days === value
                      ? "bg-[#2563EB] text-white"
                      : "bg-[#EFF4F8] text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full flex-1">
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              {chartData.length > 0 ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} horizontal={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={12}
                    minTickGap={24}
                    tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-mono)", letterSpacing: "1px" }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase();
                    }}
                  />
                  <ChartTooltip
                    cursor={{ stroke: "#2563EB", strokeWidth: 1, strokeDasharray: "3 3" }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        }
                        indicator="dot"
                      />
                    }
                  />
                  <Area
                    dataKey="count"
                    type="monotone"
                    fill="url(#fillLeads)"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#ffffff", stroke: "#2563EB", strokeWidth: 1.5 }}
                    activeDot={{ r: 4, fill: "#2563EB", strokeWidth: 0 }}
                  />
                </AreaChart>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-[#94A3B8]">Loading chart data…</p>
                </div>
              )}
            </ChartContainer>
          </div>
        </div>

        {/* ── Lower Section ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Leads side panel */}
          <div className="lg:col-span-2 bg-white rounded-[10px] p-6 flex flex-col shadow-sm border border-transparent" style={{ boxShadow: "0 2px 8px rgba(37,99,235,0.04)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-bold text-[#0F172A]">Recent Leads</h2>
              <button
                onClick={() => router.push("/leads")}
                className="text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
              >
                View All
              </button>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              {leadsLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))
              ) : recentLeads.length > 0 ? (
                recentLeads.map((lead, index) => {
                  const nameParts = lead.full_name.split(" ");
                  const initials = (nameParts[0]?.[0] ?? "") + (nameParts[1]?.[0] ?? "");
                  const avatarColors = ["bg-[#2563EB] text-white", "bg-[#DBEAFE] text-[#1E3A8A]", "bg-[#E2E8F0] text-[#475569]"];
                  const avatarColor = avatarColors[index % avatarColors.length];
                  const stageName = typeof lead.stage === "object" && lead.stage !== null ? (lead.stage as { name: string }).name?.toLowerCase() ?? "" : String(lead.stage ?? "").toLowerCase();
                  const badgeColor = stageName.includes("qualif") ? "bg-blue-100 text-blue-600" : stageName.includes("negotiat") ? "bg-emerald-100 text-emerald-600" : stageName.includes("close") || stageName.includes("won") ? "bg-green-100 text-green-700" : stageName.includes("lost") ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600";
                  
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center gap-4 p-3.5 rounded-lg bg-[#F8FAFC] cursor-pointer hover:bg-[#F1F5F9] transition-colors"
                      onClick={() => router.push(`/leads/${lead.id}`)}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor}`}>
                        {initials.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-[14px] font-bold text-[#0F172A] truncate">
                          {lead.full_name}
                        </p>
                        <p className="text-[12px] text-[#64748B] truncate mt-0.5">
                          Inquiry: {lead.project?.name ?? "General Inquiry"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-[13px] font-bold text-[#0F172A] font-mono">
                           ${lead.max_budget ? (lead.max_budget / 1000).toFixed(0) + 'k' : '---'}
                        </p>
                        {lead.stage && (
                          <span className={`text-[8px] font-bold px-2 py-[3px] rounded uppercase tracking-widest ${badgeColor}`}>
                            {typeof lead.stage === "object" ? (lead.stage as { name: string }).name : lead.stage}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[#94A3B8] text-center mt-8">No recent leads</p>
              )}
            </div>
          </div>

          {/* Featured Project */}
          {featuredProject && (
            <div className="bg-white rounded-[10px] shadow-sm flex flex-col border border-transparent overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(37,99,235,0.04)" }}>
              <div className="flex items-center gap-2 px-6 pt-6 pb-2">
                <h2 className="text-[17px] font-bold text-[#0F172A]">Featured Project</h2>
              </div>
              <div className="px-6 flex flex-col flex-1 pb-6 relative">
                 <div className="relative w-full h-[180px] rounded-lg overflow-hidden bg-gray-100 shrink-0 mt-2">
                   <div className="absolute right-3 top-3 z-10 px-3 py-1 bg-white backdrop-blur-sm rounded-full shadow-sm">
                     <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest">FOR SALE</span>
                   </div>
                   <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80" alt="Property" className="w-full h-full object-cover" />
                 </div>

                 <div className="mt-5 space-y-1">
                    <h3 className="text-[16px] font-bold text-[#0F172A]">
                      {featuredProject.name}
                    </h3>
                    <p className="text-[13px] text-[#64748B]">
                      {featuredProject.address || "Beverly Hills, CA 90210"}
                    </p>
                 </div>

                 <div className="flex items-center justify-between mt-6 pt-5 border-t border-[#F1F5F9]">
                    <div className="flex-1 text-center">
                      <p className="text-[18px] font-bold text-[#0F172A] font-mono leading-none">
                        12
                      </p>
                      <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mt-1">
                        Active Leads
                      </p>
                    </div>
                    <div className="w-px h-8 bg-[#F1F5F9]" />
                    <div className="flex-1 text-center">
                      <p className="text-[18px] font-bold text-[#0F172A] font-mono leading-none">
                        {featuredProject.price ? `$${(featuredProject.price / 1000000).toFixed(1)}M` : "$---"}
                      </p>
                      <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mt-1">
                        Target Price
                      </p>
                    </div>
                 </div>

                 <button
                    onClick={() => router.push(`/projects/${featuredProject.id}`)}
                    className="w-full mt-6 bg-[#F1F5F8] hover:bg-[#E2E8F0] text-[#0F172A] text-[13px] font-bold py-3 rounded-md transition-colors"
                 >
                    Manage Project
                 </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
