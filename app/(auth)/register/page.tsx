"use client";

import { useState, useTransition } from "react";
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
import { Building2, CheckCircle2, ExternalLink, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { registerAgency } from "@/lib/api";

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

export default function RegisterPage() {
  const [agencyName, setAgencyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [workspaceUrl, setWorkspaceUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    startTransition(async () => {
      try {
        const res = await registerAgency({
          agency_name: agencyName,
          subdomain,
          admin_email: adminEmail,
          admin_password: adminPassword,
        });
        setWorkspaceUrl(res.workspace_url);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Registration failed. Please try again.");
      }
    });
  }

  if (workspaceUrl) {
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
            href={workspaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {workspaceUrl}
          </a>
          <Button asChild className="w-full">
            <a href={workspaceUrl}>Go to my dashboard</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

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
              disabled={isPending}
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
                disabled={isPending}
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
              disabled={isPending}
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
                disabled={isPending}
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

          <Button type="submit" className="w-full" disabled={isPending || !subdomain}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Creating workspace…" : "Create workspace"}
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
