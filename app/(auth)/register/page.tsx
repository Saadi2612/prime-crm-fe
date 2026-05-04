"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { registerAgency, getRegistrationStatus } from "@/lib/api";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

type Phase =
  | { name: "IDLE" }
  | { name: "SUBMITTING" }
  | { name: "PROVISIONING"; subdomain: string; workspaceUrl: string }
  | { name: "READY"; workspaceUrl: string }
  | { name: "FAILED"; prefill: { agencyName: string; subdomain: string; adminEmail: string } };

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 240000;

export default function RegisterPage() {
  const [agencyName, setAgencyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: "IDLE" });
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState("");
  const [isPending, startTransition] = useTransition();

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkErrorCountRef = useRef(0);

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  function startPolling(sub: string, workspaceUrl: string, prefill: { agencyName: string; subdomain: string; adminEmail: string }) {
    networkErrorCountRef.current = 0;

    pollTimeoutRef.current = setTimeout(() => {
      stopPolling();
      setPhase({ name: "FAILED", prefill });
    }, POLL_TIMEOUT_MS);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await getRegistrationStatus(sub);
        networkErrorCountRef.current = 0;

        if (res.progress != null) setProgress(res.progress);
        if (res.step) setProgressStep(res.step);

        if (res.status === "active") {
          setProgress(100);
          stopPolling();
          setPhase({ name: "READY", workspaceUrl });
        } else if (res.status === "failed") {
          stopPolling();
          setPhase({ name: "FAILED", prefill });
        }
      } catch {
        networkErrorCountRef.current += 1;
        if (networkErrorCountRef.current >= 3) {
          stopPolling();
          setPhase({ name: "FAILED", prefill });
        }
      }
    }, POLL_INTERVAL_MS);
  }

  function handleAgencyNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setAgencyName(val);
    if (!subdomainEdited) {
      setSubdomain(slugify(val));
    }
  }

  function handleSubdomainChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSubdomainEdited(true);
    setSubdomain(slugify(e.target.value));
  }

  const previewHost =
    typeof window !== "undefined" && window.location.hostname.includes("localhost")
      ? "localhost"
      : typeof window !== "undefined"
      ? window.location.hostname.split(".").slice(-2).join(".")
      : "yourdomain.com";

  const workspacePreview = subdomain ? `${subdomain}.${previewHost}` : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase({ name: "SUBMITTING" });
    startTransition(async () => {
      try {
        const res = await registerAgency({
          agency_name: agencyName,
          subdomain,
          admin_email: adminEmail,
          admin_password: adminPassword,
        });
        const prefill = { agencyName, subdomain, adminEmail };
        setPhase({ name: "PROVISIONING", subdomain: res.subdomain, workspaceUrl: res.workspace_url });
        startPolling(res.subdomain, res.workspace_url, prefill);
      } catch (err: unknown) {
        setPhase({ name: "IDLE" });
        toast.error(err instanceof Error ? err.message : "Registration failed. Please try again.");
      }
    });
  }

  function handleTryAgain(prefill: { agencyName: string; subdomain: string; adminEmail: string }) {
    setAgencyName(prefill.agencyName);
    setSubdomain(prefill.subdomain);
    setSubdomainEdited(true);
    setAdminEmail(prefill.adminEmail);
    setAdminPassword("");
    setPhase({ name: "IDLE" });
  }

  // PROVISIONING screen
  if (phase.name === "PROVISIONING") {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">PropFlow CRM</span>
          </div>
          <CardTitle className="text-2xl font-semibold">Setting up your workspace…</CardTitle>
          <CardDescription>This usually takes 15–30 seconds. Do not close this tab.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground truncate pr-2">
              {progressStep || "Initializing…"}
            </span>
            <span className="font-semibold tabular-nums text-foreground shrink-0">
              {progress}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center pt-1">
            Do not close this tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  // READY / success screen
  if (phase.name === "READY") {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">PropFlow CRM</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <CardTitle className="text-2xl font-semibold">Workspace ready!</CardTitle>
          </div>
          <CardDescription>Your agency has been provisioned successfully.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your workspace is live at:
          </p>
          <a
            href={phase.workspaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {phase.workspaceUrl}
          </a>
          <Button asChild className="w-full">
            <a href={phase.workspaceUrl}>Go to my dashboard</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // FAILED screen
  if (phase.name === "FAILED") {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">PropFlow CRM</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl font-semibold">Workspace setup failed</CardTitle>
          </div>
          <CardDescription>
            We couldn&apos;t provision your workspace. Please contact support or try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button className="w-full" onClick={() => handleTryAgain(phase.prefill)}>
            Try Again
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <a href="mailto:support@propflowcrm.com">Contact Support</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // IDLE / SUBMITTING — registration form
  const isDisabled = isPending || phase.name === "SUBMITTING";

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">PropFlow CRM</span>
        </div>
        <CardTitle className="text-2xl font-semibold">Create your workspace</CardTitle>
        <CardDescription>Set up your agency in seconds.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="agency_name">Agency name</Label>
            <Input
              id="agency_name"
              type="text"
              placeholder="Acme Real Estate"
              required
              value={agencyName}
              onChange={handleAgencyNameChange}
              disabled={isDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subdomain">Workspace URL</Label>
            <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-1 focus-within:ring-ring overflow-hidden">
              <Input
                id="subdomain"
                type="text"
                placeholder="acme"
                required
                value={subdomain}
                onChange={handleSubdomainChange}
                disabled={isDisabled}
                className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 min-w-0"
              />
              {workspacePreview && (
                <span className="shrink-0 bg-muted px-3 py-2 text-xs text-muted-foreground border-l border-input select-none">
                  .{previewHost}
                </span>
              )}
            </div>
            {workspacePreview && (
              <p className="text-xs text-muted-foreground">
                Your workspace: <span className="font-medium text-foreground">{workspacePreview}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_email">Admin email</Label>
            <Input
              id="admin_email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              disabled={isDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_password">Password</Label>
            <div className="relative">
              <Input
                id="admin_password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={8}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                disabled={isDisabled}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isDisabled || !subdomain}>
            {isDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDisabled ? "Creating workspace…" : "Create workspace"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have a workspace?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
