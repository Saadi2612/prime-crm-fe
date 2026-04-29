"use client";

import { useEffect, useState } from "react";
import { fetchDashboardStats, fetchStages, DashboardStats } from "@/lib/api";
import { Stage } from "@/types/leads";

const STAGE_STYLES: Record<string, { bg: string; titleText: string; numText: string }> = {
    total: { bg: "bg-[#EFF6FF]", titleText: "text-[#2563eb]", numText: "text-[#1e40af]" },
    new: { bg: "bg-[#F0F9FF]", titleText: "text-[#0369a1]", numText: "text-[#0c4a6e]" },
    contacted: { bg: "bg-[#EEF2FF]", titleText: "text-[#4338ca]", numText: "text-[#312e81]" },
    pipeline: { bg: "bg-[#ECFEFF]", titleText: "text-[#0e7490]", numText: "text-[#164e63]" },
    qualified: { bg: "bg-[#ECFDF5]", titleText: "text-[#047857]", numText: "text-[#064e3b]" },
    unqualified: { bg: "bg-[#FFF1F2]", titleText: "text-[#be123c]", numText: "text-[#881337]" },
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

    if (loading || !stats) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-slate-100 p-5 rounded-xl h-[88px]" />
                ))}
            </div>
        );
    }

    const tStyle = STAGE_STYLES.total;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {/* Total Leads Card */}
            <div className={`${tStyle.bg} p-5 rounded-xl transition-all hover:scale-[1.02]`}>
                <p className={`${tStyle.titleText} text-[0.6875rem] font-bold uppercase tracking-wider mb-1`}>Total</p>
                <p className={`font-mono text-2xl font-semibold ${tStyle.numText}`}>
                    {stats.total_leads}
                </p>
            </div>

            {/* Stage Cards */}
            {stages.map((stage) => {
                const stageName = stage.name.toLowerCase();
                const style = STAGE_STYLES[stageName] || { bg: "bg-slate-50", titleText: "text-slate-600", numText: "text-slate-900" };

                return (
                    <div key={stage.id} className={`${style.bg} p-5 rounded-xl transition-all hover:scale-[1.02]`}>
                        <p className={`${style.titleText} text-[0.6875rem] font-bold uppercase tracking-wider mb-1 truncate`}>
                            {stage.name}
                        </p>
                        <p className={`font-mono text-2xl font-semibold ${style.numText}`}>
                            {stats.stage_counts?.[stageName] ?? 0}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
