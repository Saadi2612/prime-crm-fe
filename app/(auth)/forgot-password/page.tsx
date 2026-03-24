"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Eye, EyeOff, Loader2, KeyRound, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { forgotPassword, verifyOtp, resetPassword } from "@/lib/api";

type Step = 1 | 2 | 3;

export default function ForgotPasswordPage() {
    const router = useRouter();

    const [step, setStep] = useState<Step>(1);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [isPending, startTransition] = useTransition();

    async function handleRequestOtp(e: React.FormEvent) {
        e.preventDefault();
        startTransition(async () => {
            try {
                const res = await forgotPassword(email);
                toast.success(res.detail || "OTP sent to your email.");
                setStep(2);
            } catch (err: unknown) {
                toast.error((err as Error).message || "Failed to request OTP.");
            }
        });
    }

    async function handleVerifyOtp(e: React.FormEvent) {
        e.preventDefault();
        startTransition(async () => {
            try {
                const res = await verifyOtp(email, otp);
                toast.success(res.detail || "OTP verified.");
                setStep(3);
            } catch (err: unknown) {
                toast.error((err as Error).message || "Invalid OTP.");
            }
        });
    }

    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        startTransition(async () => {
            try {
                const res = await resetPassword(email, otp, password, confirmPassword);
                toast.success(res.detail || "Password reset successfully.");
                router.replace("/login");
            } catch (err: unknown) {
                toast.error((err as Error).message || "Failed to reset password.");
            }
        });
    }

    return (
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="space-y-1 pb-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <KeyRound className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">PropFlow CRM</span>
                </div>
                <CardTitle className="text-2xl font-semibold">
                    {step === 1 && "Forgot Password"}
                    {step === 2 && "Verify OTP"}
                    {step === 3 && "Reset Password"}
                </CardTitle>
                <CardDescription>
                    {step === 1 && "Enter your email to receive a password reset code."}
                    {step === 2 && "Enter the 6-digit code sent to your email."}
                    {step === 3 && "Create a new strong password for your account."}
                </CardDescription>
            </CardHeader>

            <CardContent>
                {step === 1 && (
                    <form onSubmit={handleRequestOtp} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isPending}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isPending ? "Sending code…" : "Send Reset Code"}
                            {!isPending && <Mail className="ml-2 h-4 w-4" />}
                        </Button>
                        
                        <div className="text-center mt-4">
                            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                                Back to login
                            </Link>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="otp">6-Digit Code</Label>
                            <Input
                                id="otp"
                                type="text"
                                placeholder="123456"
                                maxLength={6}
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                disabled={isPending}
                                className="tracking-widest text-center text-lg uppercase"
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isPending ? "Verifying…" : "Verify Code"}
                            {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                        
                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                            >
                                Use a different email
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="new_password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="new_password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isPending}
                                    className="pr-10"
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm_password">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirm_password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isPending}
                                    className="pr-10"
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isPending ? "Resetting…" : "Reset Password"}
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
