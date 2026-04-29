"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    AlertTriangle, Building2, LogIn, MapPin, Plus,
    RefreshCw, Search, MoreVertical, Edit, Trash2,
    SlidersHorizontal, ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";

import Image from "next/image";
import { fetchProjects, deleteProject, type Project, type ProjectType } from "@/lib/api";
import { AddProjectDialog } from "@/components/projects/add-project-dialog";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ProjectType, string> = {
    plot: "PLOT", apartment: "APT", house: "HOUSE",
    portion: "PORTION", office: "OFFICE", townhouse: "TOWNHOUSE",
};

const ALL_TYPES: ProjectType[] = ["plot", "apartment", "house", "portion", "office", "townhouse"];

function formatPrice(price?: number | null): string {
    if (!price) return "—";
    if (price >= 10_000_000) return `PKR ${(price / 10_000_000).toFixed(1)}Cr`;
    if (price >= 100_000) return `PKR ${(price / 100_000).toFixed(0)}L`;
    return `PKR ${price.toLocaleString()}`;
}

function formatSize(size: number, unit: string): string {
    return `${size.toLocaleString()} ${unit.toUpperCase()}`;
}

const PLACEHOLDER_GRADIENTS = [
    "from-[#1e3a8a] to-[#1e40af]",
    "from-[#0c4a6e] to-[#075985]",
    "from-[#1e293b] to-[#334155]",
    "from-[#14532d] to-[#166534]",
    "from-[#3b0764] to-[#6b21a8]",
    "from-[#7c2d12] to-[#9a3412]",
];

function placeholderGradient(id: string) {
    const h = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return PLACEHOLDER_GRADIENTS[h % PLACEHOLDER_GRADIENTS.length];
}

function computeStats(projects: Project[]) {
    const totalSqft = projects.reduce((acc, p) => {
        return acc + (p.size_unit === "marla" ? p.size * 272.25 : p.size);
    }, 0);
    const totalValue = projects.reduce((acc, p) => acc + (p.price ?? 0), 0);
    return { totalSqft, totalValue };
}

function formatSqft(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return Math.round(n).toLocaleString();
}

function formatValuation(n: number): string {
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
    return `$${n.toLocaleString()}`;
}

// ── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onEdit, onDelete }: {
    project: Project;
    onEdit: (p: Project) => void;
    onDelete: (p: Project) => void;
}) {
    const gradient = placeholderGradient(project.id);
    const typeLabel = TYPE_LABELS[project.type] ?? project.type.toUpperCase();

    return (
        <div className="group rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 border border-[#F1F5F9]">
            {/* Image */}
            <div className="relative h-48 w-full overflow-hidden">
                {project.image ? (
                    <>
                        <Image
                            src={project.image}
                            alt={project.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-blue-900/10" />
                    </>
                ) : (
                    <div className={`h-full w-full bg-linear-to-br ${gradient} flex items-center justify-center`}>
                        <Building2 className="h-14 w-14 text-white/20" />
                    </div>
                )}

                {/* Type badge */}
                <span className="absolute top-3 left-3 bg-[#1E293B]/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded tracking-widest">
                    {typeLabel}
                </span>

                {/* Action menu */}
                <div className="absolute top-3 right-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon"
                                className="h-7 w-7 rounded bg-white/90 hover:bg-white text-[#0F172A] shadow-sm border-0"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(project)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onClick={() => onDelete(project)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Card body */}
            <div className="p-5 space-y-3">
                <div>
                    <h3 className="text-[15px] font-bold text-[#0F172A] leading-snug">
                        {project.name}
                    </h3>
                    {project.address && (
                        <p className="mt-1 flex items-center gap-1 text-[12px] text-[#64748B]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{project.address}</span>
                        </p>
                    )}
                </div>

                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]">
                            Starting Price
                        </p>
                        <p className="text-[17px] font-bold text-[#2563EB] font-mono leading-tight mt-0.5">
                            {formatPrice(project.price)}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#EFF6FF] px-2.5 py-1.5 rounded text-[#2563EB]">
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M1 15h14M1 1v14M3 11l4-4 3 3 5-5" />
                        </svg>
                        <span className="text-[10px] font-bold tracking-wide">
                            {formatSize(project.size, project.size_unit)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function ProjectCardSkeleton() {
    return (
        <div className="rounded-xl bg-white overflow-hidden shadow-sm border border-[#F1F5F9]">
            <div className="h-48 w-full bg-[#E2E8F0] animate-pulse" />
            <div className="p-5 space-y-3">
                <div className="space-y-1.5">
                    <div className="h-4 w-3/4 bg-[#E2E8F0] rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-[#E2E8F0] rounded animate-pulse" />
                </div>
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <div className="h-2.5 w-16 bg-[#E2E8F0] rounded animate-pulse" />
                        <div className="h-5 w-28 bg-[#E2E8F0] rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-20 bg-[#E2E8F0] rounded animate-pulse" />
                </div>
            </div>
        </div>
    );
}

// ── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ projects }: { projects: Project[] }) {
    const { totalSqft, totalValue } = computeStats(projects);
    const stats = [
        { value: formatSqft(totalSqft), label: "Total Square Footage" },
        { value: formatValuation(totalValue), label: "Pipeline Valuation" },
        { value: "--", label: "Pending Closings" },
        { value: String(projects.length).padStart(2, "0"), label: "Project Leads" },
    ];
    return (
        <div className="border-t border-[#E2E8F0] bg-white flex h-16 shrink-0">
            {stats.map((s, i) => (
                <div
                    key={s.label}
                    className={`flex-1 flex flex-col items-center justify-center ${i < stats.length - 1 ? "border-r border-[#E2E8F0]" : ""}`}
                >
                    <p className="text-[18px] font-bold text-[#0F172A] font-mono leading-none">{s.value}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8] mt-1">{s.label}</p>
                </div>
            ))}
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function ProjectsPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (searchParams.get("action") === "new") {
            setDialogOpen(true);
            router.replace("/projects");
        }
    }, [searchParams, router]);

    const load = useCallback(() => {
        setLoading(true);
        setError(null);
        fetchProjects({ search: search || undefined, type: typeFilter !== "all" ? typeFilter : undefined })
            .then(setProjects)
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, [search, typeFilter]);

    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    function handleProjectCreated(created: Project) {
        setProjects((prev) => [created, ...prev]);
    }
    function handleProjectUpdated(updated: Project) {
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
    function handleEditClick(project: Project) { setProjectToEdit(project); setEditDialogOpen(true); }
    function handleDeleteClick(project: Project) { setProjectToDelete(project); setDeleteDialogOpen(true); }

    async function confirmDelete() {
        if (!projectToDelete) return;
        setDeleting(true);
        try {
            await deleteProject(projectToDelete.id);
            setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
            toast.success("Project deleted");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete project");
        } finally {
            setDeleting(false);
            setDeleteDialogOpen(false);
            setProjectToDelete(null);
        }
    }

    return (
        <>
            <AddProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={handleProjectCreated} />
            <EditProjectDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} project={projectToEdit} onSuccess={handleProjectUpdated} />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete &quot;{projectToDelete?.name}&quot;? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                            {deleting ? "Deleting..." : "Delete"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex flex-col min-h-full bg-[#F8FAFC]">
                <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">

                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-[28px] font-bold text-[#0F172A] leading-tight">Projects</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[13px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                                    {loading ? "--" : projects.length}
                                </span>
                                <span className="text-[13px] text-[#64748B]">Active high-priority developments</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <button className="flex items-center gap-1.5 h-8 px-3 bg-white border border-[#E2E8F0] text-[#475569] text-[12px] font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors">
                                <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                            </button>
                            <button className="flex items-center gap-1.5 h-8 px-3 bg-white border border-[#E2E8F0] text-[#475569] text-[12px] font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors">
                                <ArrowUpDown className="w-3.5 h-3.5" /> Sort by Price
                            </button>
                        </div>
                    </div>

                    {/* Search + type pills */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                className="w-full h-9 pl-9 pr-3 bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#2563EB] transition-colors"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {(["all", ...ALL_TYPES] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTypeFilter(t)}
                                    className={`px-3 py-1 text-[11px] font-bold rounded tracking-wide transition-colors ${
                                        typeFilter === t
                                            ? "bg-[#2563EB] text-white"
                                            : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB]"
                                    }`}
                                >
                                    {t === "all" ? "ALL" : TYPE_LABELS[t as ProjectType]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
                            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-700">Something went wrong</p>
                                <p className="text-sm text-red-600 mt-0.5">{error}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {error.toLowerCase().includes("session") || error.toLowerCase().includes("log in") ? (
                                    <Button size="sm" variant="destructive" className="gap-1.5 h-8 text-xs" onClick={() => router.push("/login")}>
                                        <LogIn className="h-3.5 w-3.5" /> Log in again
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={load}>
                                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {Array.from({ length: 6 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <Building2 className="h-12 w-12 text-[#CBD5E1] mb-4" />
                            <p className="text-base font-bold text-[#0F172A]">No projects found</p>
                            <p className="text-sm text-[#64748B] mt-1 mb-5">
                                {search || typeFilter !== "all"
                                    ? "Try adjusting your search or filters."
                                    : "Create your first project to get started."}
                            </p>
                            {!search && typeFilter === "all" && (
                                <button
                                    onClick={() => setDialogOpen(true)}
                                    className="flex items-center gap-2 h-9 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add Project
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {projects.map((project) => (
                                <ProjectCard key={project.id} project={project} onEdit={handleEditClick} onDelete={handleDeleteClick} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Stats bar */}
                {!loading && projects.length > 0 && <StatsBar projects={projects} />}
            </div>
        </>
    );
}

export default function ProjectsPage() {
    return (
        <Suspense>
            <ProjectsPageInner />
        </Suspense>
    );
}
