"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
    confirmTotpSetup,
    disableTotp,
    fetchTotpStatus,
    regenerateBackupCodes,
    startTotpSetup,
    type TotpSetup,
    type TotpStatus,
} from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertCircle,
    Check,
    Copy,
    KeyRound,
    Loader2,
    ShieldCheck,
    ShieldOff,
} from "lucide-react";

type Stage = "idle" | "enrolling" | "showing_backup_codes";

export default function SecuritySettingsPage() {
    const [status, setStatus] = useState<TotpStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [stage, setStage] = useState<Stage>("idle");
    const [setup, setSetup] = useState<TotpSetup | null>(null);
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setStatus(await fetchTotpStatus());
        } catch {
            toast.error("Failed to load security settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function handleStartSetup() {
        setBusy(true);
        setError(null);
        try {
            setSetup(await startTotpSetup());
            setStage("enrolling");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not start setup.");
        } finally {
            setBusy(false);
        }
    }

    async function handleConfirm(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const { backup_codes } = await confirmTotpSetup(code.trim());
            setBackupCodes(backup_codes);
            setStage("showing_backup_codes");
            setCode("");
            setSetup(null); // drop the secret from memory as soon as it is confirmed
            await load();
            toast.success("Two-factor authentication enabled.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "That code is not valid.");
            setCode("");
        } finally {
            setBusy(false);
        }
    }

    async function handleDisable(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await disableTotp(password);
            setPassword("");
            await load();
            toast.success("Two-factor authentication disabled.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not disable two-factor.");
        } finally {
            setBusy(false);
        }
    }

    async function handleRegenerate() {
        setBusy(true);
        try {
            const { backup_codes } = await regenerateBackupCodes();
            setBackupCodes(backup_codes);
            setStage("showing_backup_codes");
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not regenerate codes.");
        } finally {
            setBusy(false);
        }
    }

    function copyBackupCodes() {
        navigator.clipboard.writeText(backupCodes.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading security settings…
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl space-y-6" data-testid="security-settings">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Protect your account with a second verification step at sign-in.
                </p>
            </div>

            {status && !status.is_available && (
                <Alert data-testid="totp-unavailable">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Two-factor authentication is not enabled for this workspace. An
                        administrator can turn it on in workspace settings.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        {status?.is_enabled ? (
                            <ShieldCheck className="h-5 w-5 text-green-600" />
                        ) : (
                            <ShieldOff className="h-5 w-5 text-muted-foreground" />
                        )}
                        Authenticator app
                        <span
                            data-testid="totp-state"
                            className={`ml-2 text-xs font-medium rounded-full px-2 py-0.5 ${status?.is_enabled
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-600"
                                }`}
                        >
                            {status?.is_enabled ? "Enabled" : "Disabled"}
                        </span>
                    </CardTitle>
                    <CardDescription>
                        Use a TOTP app such as 1Password, Authy, or Google Authenticator to
                        generate a 6-digit code at each sign-in.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                    {/* ── Enrollment: QR + manual key + confirmation ── */}
                    {stage === "enrolling" && setup && (
                        <div className="space-y-4" data-testid="totp-enrollment">
                            <div className="flex flex-col sm:flex-row gap-5">
                                <Image
                                    src={setup.qr_code}
                                    alt="Two-factor QR code"
                                    width={176}
                                    height={176}
                                    unoptimized
                                    data-testid="totp-qr"
                                    className="h-44 w-44 rounded-lg border bg-white p-2"
                                />
                                <div className="space-y-2 min-w-0">
                                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                        Or enter this key manually
                                    </Label>
                                    <code
                                        data-testid="totp-manual-key"
                                        className="block break-all rounded-md bg-muted px-3 py-2 font-mono text-sm"
                                    >
                                        {setup.secret}
                                    </code>
                                    <p className="text-xs text-muted-foreground">
                                        Account: {setup.account}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleConfirm} className="space-y-3" data-testid="totp-confirm-form">
                                <Label htmlFor="confirm-code">
                                    Enter the code shown in your app to finish
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="confirm-code"
                                        data-testid="totp-confirm-code"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        placeholder="000000"
                                        maxLength={6}
                                        required
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        disabled={busy}
                                        className="max-w-[10rem] tracking-[0.4em] text-center"
                                    />
                                    <Button type="submit" disabled={busy} data-testid="totp-confirm-submit">
                                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Verify and enable
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={busy}
                                        onClick={() => {
                                            setStage("idle");
                                            setSetup(null);
                                            setCode("");
                                            setError(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                                {error && (
                                    <p data-testid="totp-setup-error" role="alert" className="text-sm text-destructive">
                                        {error}
                                    </p>
                                )}
                            </form>
                        </div>
                    )}

                    {/* ── Backup codes, shown exactly once ── */}
                    {stage === "showing_backup_codes" && (
                        <div className="space-y-3" data-testid="totp-backup-codes">
                            <Alert>
                                <KeyRound className="h-4 w-4" />
                                <AlertDescription>
                                    Save these codes now — each works once and they cannot be
                                    shown again. Use one if you lose access to your
                                    authenticator.
                                </AlertDescription>
                            </Alert>
                            <ul className="grid grid-cols-2 gap-2 rounded-md border p-3 font-mono text-sm">
                                {backupCodes.map((c) => (
                                    <li key={c} data-testid="totp-backup-code">
                                        {c}
                                    </li>
                                ))}
                            </ul>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={copyBackupCodes}>
                                    {copied ? (
                                        <Check className="mr-2 h-4 w-4" />
                                    ) : (
                                        <Copy className="mr-2 h-4 w-4" />
                                    )}
                                    {copied ? "Copied" : "Copy all"}
                                </Button>
                                <Button
                                    type="button"
                                    data-testid="totp-backup-codes-done"
                                    onClick={() => {
                                        setBackupCodes([]);
                                        setStage("idle");
                                    }}
                                >
                                    I have saved them
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── Idle: enable, or manage an active device ── */}
                    {stage === "idle" && !status?.is_enabled && (
                        <Button
                            type="button"
                            onClick={handleStartSetup}
                            disabled={busy || !status?.is_available}
                            data-testid="totp-enable-button"
                        >
                            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Set up two-factor authentication
                        </Button>
                    )}

                    {stage === "idle" && status?.is_enabled && (
                        <div className="space-y-5">
                            <p className="text-sm text-muted-foreground">
                                Enabled
                                {status.confirmed_at
                                    ? ` on ${new Date(status.confirmed_at).toLocaleDateString()}`
                                    : ""}
                                . {status.backup_codes_remaining} backup code
                                {status.backup_codes_remaining === 1 ? "" : "s"} remaining.
                            </p>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRegenerate}
                                disabled={busy}
                                data-testid="totp-regenerate-button"
                            >
                                Regenerate backup codes
                            </Button>

                            <form onSubmit={handleDisable} className="space-y-3 border-t pt-5" data-testid="totp-disable-form">
                                <Label htmlFor="disable-password">
                                    Confirm your password to turn two-factor off
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="disable-password"
                                        data-testid="totp-disable-password"
                                        type="password"
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={busy}
                                        className="max-w-xs"
                                    />
                                    <Button
                                        type="submit"
                                        variant="destructive"
                                        disabled={busy}
                                        data-testid="totp-disable-submit"
                                    >
                                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Disable
                                    </Button>
                                </div>
                                {error && (
                                    <p data-testid="totp-disable-error" role="alert" className="text-sm text-destructive">
                                        {error}
                                    </p>
                                )}
                            </form>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
