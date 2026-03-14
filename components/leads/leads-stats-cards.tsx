"use client";

import { useEffect, useState } from "react";
import { fetchDashboardStats, fetchStages, DashboardStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stage } from "@/types/leads";
import { FileText } from "lucide-react";

// Icons mapping depending on stage name
import { Target, Search, Handshake, CheckCircle2, XCircle, BarChart2 } from "lucide-react";

const STAGE_ICONS: Record<string, React.ElementType> = {
    new: Target,
    contacted: Search,
    negotiation: Handshake,
    qualified: CheckCircle2,
    lost: XCircle,
};

export function LeadsStatsCards() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [statsData, stagesData] = await Promise.all([
                    fetchDashboardStats(),
                    fetchStages()
                ]);
                setStats(statsData);
                // Sort stages by order
                setStages([...stagesData].sort((a, b) => a.order - b.order));
            } catch (error) {
                console.error("Failed to load stats:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-3 lg:flex lg:flex-wrap mb-6">
                {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse lg:flex-1 min-w-[180px]">
                        <CardHeader className="h-[90px]" />
                    </Card>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="grid gap-4 md:grid-cols-3 lg:flex lg:flex-wrap mb-6">
            <Card className="lg:flex-1 min-w-[180px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats.total_leads}
                    </div>
                </CardContent>
            </Card>

            {stages.map((stage) => {
                const stageName = stage.name.toLowerCase();
                const Icon = STAGE_ICONS[stageName] || FileText;

                return (
                    <Card key={stage.id} className="lg:flex-1 min-w-[180px]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium capitalize">{stage.name}</CardTitle>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.stage_counts?.[stageName] ?? 0}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
