"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    Building2,
    LogIn,
    MapPin,
    Plus,
    RefreshCw,
    Ruler,
    Search,
    Tag,
} from "lucide-react";

import { fetchProjects, type Project, type ProjectType } from "@/lib/api";
import { AddProjectDialog } from "@/components/projects/add-project-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// ── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ProjectType, string> = {
    plot: "Plot",
    apartment: "Apartment",
    house: "House",
    portion: "Portion",
    office: "Office",
    townhouse: "Townhouse",
};

const ALL_TYPES: ProjectType[] = ["plot", "apartment", "house", "portion", "office", "townhouse"];

function formatPrice(price?: number | null): string {
    if (!price) return "—";
    if (price >= 10_000_000) return `PKR ${(price / 10_000_000).toFixed(1)}Cr`;
    if (price >= 100_000) return `PKR ${(price / 100_000).toFixed(0)}L`;
    return `PKR ${price.toLocaleString()}`;
}

// Placeholder gradient when no image is provided
const CARD_GRADIENTS = [
    "from-slate-700 to-slate-900",
    "from-blue-800 to-blue-950",
    "from-emerald-700 to-emerald-950",
    "from-violet-700 to-violet-950",
    "from-amber-700 to-amber-950",
    "from-rose-700 to-rose-950",
];
function cardGradient(id: string) {
    const h = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return CARD_GRADIENTS[h % CARD_GRADIENTS.length];
}

// ── Project Card ────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
    const gradient = cardGradient(project.id);
    const typeLabel = TYPE_LABELS[project.type] ?? project.type;

    return (
        <div className="group rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
            {/* Image / placeholder */}
            <div className="relative h-44 w-full overflow-hidden">
                {project.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={project.image}
                        alt={project.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div
                        className={`h-full w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
                    >
                        <Building2 className="h-12 w-12 text-white/30" />
                    </div>
                )}

                {/* Type badge */}
                <span className="absolute top-3 right-3 rounded-full bg-background/90 backdrop-blur-sm text-xs font-semibold px-2.5 py-0.5 text-foreground border border-border/40 capitalize">
                    {typeLabel}
                </span>
            </div>

            {/* Card body */}
            <div className="p-4 space-y-3">
                <div>
                    <h3 className="font-semibold text-foreground text-base leading-snug truncate">
                        {project.name}
                    </h3>
                    {project.address && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{project.address}</span>
                        </p>
                    )}
                </div>

                <p className="text-lg font-bold text-foreground">{formatPrice(project.price)}</p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                    <span className="flex items-center gap-1.5">
                        <Ruler className="h-3.5 w-3.5 shrink-0" />
                        {project.size} {project.size_unit}
                    </span>
                    {project.form_id && (
                        <span className="flex items-center gap-1.5 truncate">
                            <Tag className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{project.form_id}</span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Skeleton card ────────────────────────────────────────────────────────────

function ProjectCardSkeleton() {
    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-3 w-full" />
            </div>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
    const router = useRouter();

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [dialogOpen, setDialogOpen] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        setError(null);
        fetchProjects({
            search: search || undefined,
            type: typeFilter !== "all" ? typeFilter : undefined,
        })
            .then(setProjects)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [search, typeFilter]);

    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    function handleProjectCreated(created: Project) {
        setProjects((prev) => [created, ...prev]);
    }

    return (
        <>
            <AddProjectDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={handleProjectCreated}
            />

            <div className="flex flex-col h-full">
                {/* ── Page Header ──────────────────────────────────────────────── */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
                        {loading ? (
                            <Skeleton className="h-4 w-28 mt-1" />
                        ) : (
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {projects.length} project{projects.length !== 1 ? "s" : ""} found
                            </p>
                        )}
                    </div>
                    <Button size="sm" className="gap-2 shrink-0" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Add Project
                    </Button>
                </div>

                {/* ── Toolbar ──────────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="relative flex-1 max-w-72">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="projects-search"
                            placeholder="Search projects..."
                            className="pl-9 h-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger id="projects-type-filter" className="h-9 w-[150px]">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {ALL_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                    {TYPE_LABELS[t]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* ── Error banner ─────────────────────────────────────────────── */}
                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 mb-4">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-destructive">Something went wrong</p>
                            <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {error.toLowerCase().includes("session") || error.toLowerCase().includes("log in") ? (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1.5 h-8 text-xs"
                                    onClick={() => router.push("/login")}
                                >
                                    <LogIn className="h-3.5 w-3.5" />
                                    Log in again
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                                    onClick={load}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Retry
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Grid ─────────────────────────────────────────────────────── */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <ProjectCardSkeleton key={i} />
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
                        <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-base font-medium text-foreground">No projects found</p>
                        <p className="text-sm text-muted-foreground mt-1 mb-5">
                            {search || typeFilter !== "all"
                                ? "Try adjusting your search or filters."
                                : "Get started by creating your first project."}
                        </p>
                        {!search && typeFilter === "all" && (
                            <Button
                                size="sm"
                                className="gap-2"
                                onClick={() => setDialogOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                                Add your first project
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {projects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
