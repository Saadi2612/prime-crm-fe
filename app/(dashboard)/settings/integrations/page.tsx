"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Puzzle, X } from "lucide-react";
import { fetchMetaStatus, initiateMetaOAuth, type MetaStatus } from "@/lib/api";

// Facebook brand icon (inline SVG — no extra dependency)
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.252h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function IntegrationsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  const ERROR_MESSAGES: Record<string, string> = {
    no_pages_found: "No Facebook pages found on your account. Make sure you manage at least one page.",
  };

  // Admin guard
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Handle OAuth callback query params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected === "true") {
      toast.success("Facebook pages connected successfully.");
      router.replace("/settings/integrations");
    } else if (error) {
      const msg = ERROR_MESSAGES[error] ?? `Connection failed: ${error}`;
      setErrorAlert(msg);
      router.replace("/settings/integrations");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchMetaStatus();
        setStatus(data);
      } catch {
        toast.error("Failed to load integration status.");
      } finally {
        setLoading(false);
      }
    }
    if (user?.role === "admin") {
      load();
    }
  }, [user]);

  function handleConnect() {
    startTransition(async () => {
      try {
        const { url } = await initiateMetaOAuth();
        window.location.href = url;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to start OAuth flow.");
      }
    });
  }

  function handleRefresh() {
    setLoading(true);
    fetchMetaStatus()
      .then(setStatus)
      .catch(() => toast.error("Failed to refresh status."))
      .finally(() => setLoading(false));
  }

  if (!user || user.role !== "admin") return null;

  return (
    <div className="px-8 py-7 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Puzzle className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        </div>
        <p className="text-sm text-[#64748B] mt-1 ml-14">
          Connect third-party services to automatically capture leads.
        </p>
      </div>

      {errorAlert && (
        <Alert variant="destructive" className="mb-6 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <AlertDescription className="flex-1">{errorAlert}</AlertDescription>
          <button onClick={() => setErrorAlert(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      <Card className="border-[#E8EDF2]">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1877F2] text-white shrink-0">
                <FacebookIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-[#0F172A]">
                  Facebook Lead Ads
                </CardTitle>
                <CardDescription className="text-sm text-[#64748B] mt-0.5">
                  Sync leads from your Facebook pages directly into the CRM pipeline.
                </CardDescription>
              </div>
            </div>

            {/* Status badge */}
            {!loading && status && (
              <Badge
                variant="outline"
                className={
                  status.connected
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-[#E8EDF2] bg-[#F8FAFC] text-[#64748B]"
                }
              >
                {status.connected ? (
                  <><CheckCircle2 className="mr-1 h-3 w-3" />Connected</>
                ) : (
                  "Not connected"
                )}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-[#64748B]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading status…
            </div>
          ) : status?.connected ? (
            <div className="space-y-3">
              <p className="text-sm text-[#64748B] mb-3">
                {status.pages.length} page{status.pages.length !== 1 ? "s" : ""} connected
              </p>
              <div className="divide-y divide-[#F1F5F9] rounded-lg border border-[#E8EDF2] overflow-hidden">
                {status.pages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between px-4 py-3 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1877F2] shrink-0">
                        <FacebookIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#0F172A] leading-tight">
                          {page.name}
                        </p>
                        <p className="text-xs text-[#94A3B8] leading-tight mt-0.5">ID: {page.id}</p>
                      </div>
                    </div>

                    {page.error ? (
                      <div className="flex items-center gap-1.5 text-xs text-red-600">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {page.error}
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-green-200 bg-green-50 text-green-700 text-xs"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="border-[#E2E8F0] text-[#475569] hover:text-[#0F172A]"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={isPending}
                  className="bg-[#1877F2] hover:bg-[#1565D8] text-white"
                >
                  {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Reconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[#475569] leading-relaxed">
                Connect your Facebook Business account to automatically pull leads from your
                Facebook Lead Ad forms into this CRM. Leads appear in real-time via webhook.
              </p>
              <ul className="space-y-1.5 text-sm text-[#64748B]">
                {[
                  "Sync leads from all connected Facebook pages",
                  "Real-time delivery via Meta webhook",
                  "Leads land directly in your pipeline",
                ].map((point) => (
                  <li key={point} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#0F52BA]" />
                    {point}
                  </li>
                ))}
              </ul>
              <Button
                onClick={handleConnect}
                disabled={isPending}
                className="bg-[#1877F2] hover:bg-[#1565D8] text-white"
              >
                {isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting…</>
                ) : (
                  <><FacebookIcon className="mr-2 h-4 w-4" />Connect Facebook</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsPageInner />
    </Suspense>
  );
}
