"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { clearTotpChallenge, getTotpChallenge } from "@/lib/auth";
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
import { AlertCircle, Building2, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";

/**
 * Second login step. Its own route (`/login/2fa`) rather than a mode of the
 * login page, so the state is addressable, survives a refresh, and gives
 * automation a stable place to land.
 */
export default function TwoFactorPage() {
    const router = useRouter();
    const { completeTotpLogin } = useAuth();

    const [code, setCode] = useState("");
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [challengeChecked, setChallengeChecked] = useState(false);

    // No challenge means the password step was skipped or the token expired
    // with the tab. Send them back rather than showing a form that cannot work.
    useEffect(() => {
        if (!getTotpChallenge()) {
            router.replace("/login");
            return;
        }
        setChallengeChecked(true);
    }, [router]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const token = getTotpChallenge();
        if (!token) {
            router.replace("/login");
            return;
        }

        startTransition(async () => {
            try {
                await completeTotpLogin(token, code.trim());
                clearTotpChallenge();
                toast.success("Welcome back!");
                router.replace("/dashboard");
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Verification failed.";
                setError(message);
                setCode("");
            }
        });
    }

    if (!challengeChecked) return null;

    return (
        <Card className="w-full max-w-md shadow-xl" data-testid="totp-page">
            <CardHeader className="space-y-1 pb-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">PropFlow CRM</span>
                </div>
                <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Two-step verification
                </CardTitle>
                <CardDescription>
                    {useBackupCode
                        ? "Enter one of your single-use backup codes."
                        : "Enter the 6-digit code from your authenticator app."}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5" data-testid="totp-form">
                    <div className="space-y-2">
                        <Label htmlFor="code">
                            {useBackupCode ? "Backup code" : "Verification code"}
                        </Label>
                        <Input
                            id="code"
                            data-testid="totp-code"
                            name="code"
                            type="text"
                            inputMode={useBackupCode ? "text" : "numeric"}
                            autoComplete="one-time-code"
                            placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
                            maxLength={useBackupCode ? 9 : 6}
                            required
                            autoFocus
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            disabled={isPending}
                            className={useBackupCode ? "" : "tracking-[0.5em] text-center text-lg"}
                        />
                    </div>

                    {error && (
                        <p
                            data-testid="totp-error"
                            role="alert"
                            className="flex items-start gap-2 text-sm text-destructive"
                        >
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            {error}
                        </p>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isPending}
                        data-testid="totp-submit"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isPending ? "Verifying…" : "Verify"}
                    </Button>

                    <div className="flex items-center justify-between pt-1">
                        <button
                            type="button"
                            data-testid="totp-toggle-backup"
                            onClick={() => {
                                setUseBackupCode((v) => !v);
                                setCode("");
                                setError(null);
                            }}
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            {useBackupCode ? "Use authenticator app" : "Use a backup code"}
                        </button>

                        <Link
                            href="/login"
                            data-testid="totp-cancel"
                            onClick={() => clearTotpChallenge()}
                            className="text-sm text-muted-foreground hover:underline"
                        >
                            Back to sign in
                        </Link>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
