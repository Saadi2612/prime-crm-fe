"use client";

import { useEffect, useState } from "react";
import { fetchDashboardStats, fetchDashboardChart, DashboardStats, DashboardChartData } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Users, UserCheck, Target, CalendarDays } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

const chartConfig = {
    leads: {
        label: "Leads",
        color: "var(--chart-1)",
    },
} satisfies ChartConfig;

export default function DashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [chartData, setChartData] = useState<DashboardChartData[]>([]);
    const [days, setDays] = useState<"7" | "30">("30");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && user?.role === "agent") {
            router.replace("/leads");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (authLoading || user?.role === "agent") return;

        async function loadData() {
            setLoading(true);
            try {
                const [statsData, chartResponse] = await Promise.all([
                    fetchDashboardStats(),
                    fetchDashboardChart(parseInt(days)),
                ]);
                setStats(statsData);
                setChartData(chartResponse);
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [days, authLoading, user]);

    if (authLoading || user?.role === "agent") {
        return null;
    }

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground mt-1">Welcome back to PropFlow CRM</p>
                </div>
            </div>

            {loading && !stats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-[100px]" />
                        </Card>
                    ))}
                </div>
            ) : (
                stats && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total_leads}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.active_leads}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Qualified Leads</CardTitle>
                                <UserCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.qualified_leads}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Follow-ups Today</CardTitle>
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.follow_ups_today}</div>
                            </CardContent>
                        </Card>
                    </div>
                )
            )}

            {/* Leads Chart */}
            <Card className="col-span-4">
                <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                    <div className="grid flex-1 gap-1 text-center sm:text-left">
                        <CardTitle>Total Leads</CardTitle>
                        <CardDescription>
                            Lead generation over the last {days} days
                        </CardDescription>
                    </div>
                    <Select value={days} onValueChange={(val: "7" | "30") => setDays(val)}>
                        <SelectTrigger
                            className="w-[160px] rounded-lg sm:ml-auto"
                            aria-label="Select days"
                        >
                            <SelectValue placeholder="Last 30 days" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="30" className="rounded-lg">
                                Last 30 days
                            </SelectItem>
                            <SelectItem value="7" className="rounded-lg">
                                Last 7 days
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    <ChartContainer
                        config={chartConfig}
                        className="aspect-auto h-[250px] w-full"
                    >
                        {chartData.length > 0 ? (
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor="var(--primary)"
                                            stopOpacity={0.8}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="var(--primary)"
                                            stopOpacity={0.1}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    minTickGap={32}
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return date.toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                        });
                                    }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickCount={5}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            labelFormatter={(value) => {
                                                return new Date(value).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                });
                                            }}
                                            indicator="dot"
                                        />
                                    }
                                />
                                <Area
                                    dataKey="count"
                                    type="monotone"
                                    fill="url(#fillLeads)"
                                    stroke="var(--primary)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-muted-foreground">Loading chart data...</p>
                            </div>
                        )}
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
