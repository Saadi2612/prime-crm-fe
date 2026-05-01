"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import {
    fetchDistributionSettings,
    updateDistributionSettings,
    fetchQueuedLeadsCount,
    type DistributionSettings,
} from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Settings2,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    ChevronsUpDown,
    Check,
    Calendar,
    Users,
} from "lucide-react";
import { format } from "date-fns";

const DAYS = [
    { label: "Mon", value: 0 },
    { label: "Tue", value: 1 },
    { label: "Wed", value: 2 },
    { label: "Thu", value: 3 },
    { label: "Fri", value: 4 },
    { label: "Sat", value: 5 },
    { label: "Sun", value: 6 },
];

function getTimezoneOffset(tz: string): string {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("en", {
            timeZone: tz,
            timeZoneName: "shortOffset",
        });
        const parts = formatter.formatToParts(now);
        const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
        return offset;
    } catch {
        return "";
    }
}

const ALL_TIMEZONES: string[] = (() => {
    try {
        return Intl.supportedValuesOf("timeZone");
    } catch {
        return ["UTC", "Asia/Karachi", "America/New_York", "Europe/London"];
    }
})();

export default function LeadsSettingsPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [settings, setSettings] = useState<DistributionSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [queuedCount, setQueuedCount] = useState<number | null>(null);

    // Editable form state (office hours section)
    const [timezone, setTimezone] = useState("");
    const [officeOpen, setOfficeOpen] = useState("");
    const [officeClose, setOfficeClose] = useState("");
    const [workingDays, setWorkingDays] = useState<number[]>([]);
    const [tzOpen, setTzOpen] = useState(false);
    const [tzSearch, setTzSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [timeError, setTimeError] = useState<string | null>(null);
    const [daysError, setDaysError] = useState<string | null>(null);

    // Toggle debounce ref
    const toggleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Admin guard
    useEffect(() => {
        if (user && user.role !== "admin") {
            router.replace("/dashboard");
        }
    }, [user, router]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [data, count] = await Promise.all([
                fetchDistributionSettings(),
                fetchQueuedLeadsCount().catch(() => 0),
            ]);
            setSettings(data);
            setTimezone(data.timezone);
            setOfficeOpen(data.office_open);
            setOfficeClose(data.office_close);
            setWorkingDays(data.working_days);
            setQueuedCount(count);
        } catch {
            toast.error("Failed to load distribution settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role === "admin") load();
    }, [user, load]);

    // Poll every 60s for status refresh
    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const [data, count] = await Promise.all([
                    fetchDistributionSettings(),
                    fetchQueuedLeadsCount().catch(() => 0),
                ]);
                setSettings(data);
                setQueuedCount(count);
            } catch { /* silent */ }
        }, 60_000);
        return () => clearInterval(id);
    }, []);

    async function handleToggleDistribution(enabled: boolean) {
        if (!settings) return;
        setSettings((prev) => prev ? { ...prev, is_distribution_enabled: enabled } : prev);

        if (toggleTimerRef.current) clearTimeout(toggleTimerRef.current);
        toggleTimerRef.current = setTimeout(async () => {
            try {
                const updated = await updateDistributionSettings({ is_distribution_enabled: enabled });
                setSettings(updated);
            } catch (err) {
                setSettings((prev) => prev ? { ...prev, is_distribution_enabled: !enabled } : prev);
                toast.error(err instanceof Error ? err.message : "Failed to update.");
            }
        }, 300);
    }

    function toggleDay(day: number) {
        setDaysError(null);
        setWorkingDays((prev) => {
            if (prev.includes(day)) {
                if (prev.length === 1) {
                    setDaysError("At least 1 working day required.");
                    return prev;
                }
                return prev.filter((d) => d !== day);
            }
            return [...prev, day].sort((a, b) => a - b);
        });
    }

    function validateTimes(): boolean {
        if (!officeOpen || !officeClose) {
            setTimeError("Open and close times are required.");
            return false;
        }
        if (officeOpen >= officeClose) {
            setTimeError("Open time must be before close time.");
            return false;
        }
        setTimeError(null);
        return true;
    }

    async function handleSaveHours() {
        if (!validateTimes()) return;
        if (workingDays.length === 0) {
            setDaysError("At least 1 working day required.");
            return;
        }
        setSaving(true);
        try {
            const updated = await updateDistributionSettings({
                timezone,
                office_open: officeOpen,
                office_close: officeClose,
                working_days: workingDays,
            });
            setSettings(updated);
            toast.success("Changes saved.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save. Try again.");
        } finally {
            setSaving(false);
        }
    }

    const filteredTzs = tzSearch
        ? ALL_TIMEZONES.filter((tz) => tz.toLowerCase().includes(tzSearch.toLowerCase()))
        : ALL_TIMEZONES;

    function formatNextOpen(iso: string | null): string {
        if (!iso) return "—";
        try {
            return format(new Date(iso), "EEEE, d MMM 'at' h:mm a");
        } catch {
            return iso;
        }
    }

    if (!user || user.role !== "admin") return null;

    return (
        <div className="px-8 py-7 max-w-3xl space-y-6">
            {/* Header */}
            <div className="mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <Settings2 className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Lead Settings</h1>
                </div>
                <p className="text-sm text-[#64748B] mt-1 ml-14">
                    Configure auto-distribution and office hours for incoming leads.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-[#64748B]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading settings…
                </div>
            ) : !settings ? null : (
                <>
                    {/* ── Master Toggle ─────────────────────────────────────────── */}
                    <Card className="border-[#E8EDF2]">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-base font-semibold text-[#0F172A]">
                                        Lead Distribution
                                    </CardTitle>
                                    <CardDescription className="text-sm text-[#64748B] mt-0.5">
                                        Automatically assign incoming leads to agents.
                                    </CardDescription>
                                </div>
                                <Switch
                                    checked={settings.is_distribution_enabled}
                                    onCheckedChange={handleToggleDistribution}
                                />
                            </div>
                        </CardHeader>

                        {!settings.is_distribution_enabled && (
                            <CardContent className="pt-0">
                                <Alert className="border-amber-200 bg-amber-50">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    <AlertDescription className="text-amber-700">
                                        Auto-distribution disabled. All leads will need manual assignment.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        )}
                    </Card>

                    {/* ── Status Card ───────────────────────────────────────────── */}
                    <Card className="border-[#E8EDF2]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                                <Clock className="h-4 w-4 text-[#64748B]" />
                                Distribution Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2">
                                {settings.is_office_hours_now ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                        <span className="text-sm font-medium text-green-700">Office Open</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-4 w-4 text-[#94A3B8] shrink-0" />
                                        <span className="text-sm font-medium text-[#64748B]">Office Closed</span>
                                    </>
                                )}
                            </div>

                            {settings.next_open && !settings.is_office_hours_now && (
                                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                    Next open: {formatNextOpen(settings.next_open)}
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-sm text-[#64748B]">
                                <Users className="h-3.5 w-3.5 shrink-0" />
                                Queued leads:{" "}
                                <span className="font-semibold text-[#0F172A]">
                                    {queuedCount ?? "—"}
                                </span>
                                {(queuedCount ?? 0) > 0 && (
                                    <span className="text-[#94A3B8]">awaiting distribution</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Office Hours Config ───────────────────────────────────── */}
                    {settings.is_distribution_enabled && (
                        <Card className="border-[#E8EDF2]">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base font-semibold text-[#0F172A]">
                                    Office Hours
                                </CardTitle>
                                <CardDescription className="text-sm text-[#64748B]">
                                    Leads arriving outside these hours are queued for the next open.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {/* Timezone */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-[#0F172A]">Timezone</Label>
                                    <Popover open={tzOpen} onOpenChange={setTzOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={tzOpen}
                                                className="w-full justify-between font-normal border-[#E2E8F0] text-[#0F172A]"
                                            >
                                                {timezone
                                                    ? `${timezone} (${getTimezoneOffset(timezone)})`
                                                    : "Select timezone…"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[420px] p-0" align="start">
                                            <Command>
                                                <CommandInput
                                                    placeholder="Search timezone…"
                                                    value={tzSearch}
                                                    onValueChange={setTzSearch}
                                                />
                                                <CommandList className="max-h-60">
                                                    <CommandEmpty>No timezone found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {filteredTzs.slice(0, 100).map((tz) => (
                                                            <CommandItem
                                                                key={tz}
                                                                value={tz}
                                                                onSelect={() => {
                                                                    setTimezone(tz);
                                                                    setTzSearch("");
                                                                    setTzOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={`mr-2 h-4 w-4 ${timezone === tz ? "opacity-100" : "opacity-0"}`}
                                                                />
                                                                {tz}
                                                                <span className="ml-auto text-xs text-[#94A3B8]">
                                                                    {getTimezoneOffset(tz)}
                                                                </span>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Time pickers */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="office-open" className="text-sm font-medium text-[#0F172A]">
                                            Open Time
                                        </Label>
                                        <Input
                                            id="office-open"
                                            type="time"
                                            value={officeOpen}
                                            onChange={(e) => { setOfficeOpen(e.target.value); setTimeError(null); }}
                                            className="border-[#E2E8F0]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="office-close" className="text-sm font-medium text-[#0F172A]">
                                            Close Time
                                        </Label>
                                        <Input
                                            id="office-close"
                                            type="time"
                                            value={officeClose}
                                            onChange={(e) => { setOfficeClose(e.target.value); setTimeError(null); }}
                                            className="border-[#E2E8F0]"
                                        />
                                    </div>
                                </div>
                                {timeError && (
                                    <p className="text-xs text-destructive -mt-2">{timeError}</p>
                                )}

                                {/* Working days */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-[#0F172A]">Working Days</Label>
                                    <div className="flex gap-2 flex-wrap">
                                        {DAYS.map((day) => {
                                            const active = workingDays.includes(day.value);
                                            return (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    onClick={() => toggleDay(day.value)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                                        active
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-primary/50"
                                                    }`}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {daysError && (
                                        <p className="text-xs text-destructive">{daysError}</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                                    <div className="text-xs text-[#64748B]">
                                        {settings.next_open && (
                                            <>Next distribution: {formatNextOpen(settings.next_open)}</>
                                        )}
                                    </div>
                                    <Button onClick={handleSaveHours} disabled={saving} size="sm">
                                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
