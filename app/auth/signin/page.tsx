"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faEnvelope, faArrowLeft, faBuilding, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import { signInWithEmail, signInWithGoogle, getAccountsByEmail } from "@/features/auth/services/authService";
import type { AccountInfo } from "@/common/types";
import { AuthShell, AuthHeroBrand, AuthHeroHeading } from "@/features/auth/components/AuthShell";

const SELECTED_WORKSPACE_KEY = "goal_assist_selected_workspace_id";

function friendlyAuthError(raw: string): { message: string; hint?: string } {
	const msg = raw.toLowerCase();
	if (msg.includes("email not confirmed"))
		return {
			message: "Please verify your email before signing in.",
			hint: "Check your inbox for the verification link we sent you.",
		};
	if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) return { message: "Incorrect email or password. Please try again." };
	if (msg.includes("user not found")) return { message: "No account found with this email. Try signing up." };
	if (msg.includes("too many requests"))
		return {
			message: "Too many attempts. Please wait a moment and try again.",
		};
	return { message: "Sign in failed. Please try again." };
}

function SignInPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const callbackError = searchParams.get("error");
	const emailParam = searchParams.get("email");
	const noticeParam = searchParams.get("notice");

	const [step, setStep] = useState<"email" | "password">("email");
	const [email, setEmail] = useState("");
	const [accounts, setAccounts] = useState<AccountInfo[]>([]);
	const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [errorHint, setErrorHint] = useState<string | null>(null);

	// Pre-fill email when redirected from signup ("account already exists")
	useEffect(() => {
		if (emailParam) {
			setEmail(decodeURIComponent(emailParam));
		}
	}, [emailParam]);

	const handleEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);
		setErrorHint(null);
		setIsLoading(true);

		try {
			const foundAccounts = await getAccountsByEmail(email);
			setAccounts(foundAccounts);

			// Always auto-select the first workspace (default)
			if (foundAccounts.length >= 1) {
				setSelectedWorkspaceId(foundAccounts[0].workspaceId);
			} else {
				setSelectedWorkspaceId(null);
			}

			setStep("password");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
			console.error("[SignIn] Email lookup failed:", err);
			setErrorMsg(msg);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSignIn = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);
		setErrorHint(null);
		setIsLoading(true);

		try {
			// Write selected company BEFORE sign-in so the auth provider reads it
			// immediately on the SIGNED_IN event (avoids a race condition).
			if (selectedWorkspaceId) {
				window.localStorage.setItem(SELECTED_WORKSPACE_KEY, selectedWorkspaceId);
			} else {
				window.localStorage.removeItem(SELECTED_WORKSPACE_KEY);
			}

			await signInWithEmail(email, password);
			router.push("/");
		} catch (err) {
			// Clear stored company if sign-in fails
			window.localStorage.removeItem(SELECTED_WORKSPACE_KEY);
			const raw = err instanceof Error ? err.message : "";
			const { message, hint } = friendlyAuthError(raw);
			setErrorMsg(message);
			setErrorHint(hint ?? null);
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		setErrorMsg(null);
		setErrorHint(null);
		setIsGoogleLoading(true);
		try {
			await signInWithGoogle();
		} catch (err) {
			const raw = err instanceof Error ? err.message : "Google sign in failed.";
			const { message, hint } = friendlyAuthError(raw);
			setErrorMsg(message);
			setErrorHint(hint ?? null);
			setIsGoogleLoading(false);
		}
	};

	const handleBackToEmail = () => {
		setStep("email");
		setPassword("");
		setErrorMsg(null);
		setErrorHint(null);
		setAccounts([]);
		setSelectedWorkspaceId(null);
	};

	return (
		<AuthShell
			hero={
				<div className="flex h-full w-full flex-col items-center justify-between gap-10">
					<AuthHeroBrand />
					<div className="flex w-full max-w-[400px] flex-col items-center">
						<AuthHeroHeading title="Welcome Back" subtitle="Sign in to continue tracking your goals and managing your team." />
					</div>

					<div className="grid w-full max-w-[400px] grid-cols-3 gap-6">
						{/* {[
							{ value: "10K+", label: "Active Users" },
							{ value: "50K+", label: "Goals Tracked" },
							{ value: "99%", label: "Uptime" },
						].map((stat) => (
							<div key={stat.label} className="text-center">
								<div className="font-display text-2xl font-semibold text-foreground">{stat.value}</div>
								<div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
							</div>
						))} */}
					</div>
				</div>
			}
		>
			<>
				{/* Callback error banner */}
				{callbackError === "callback_failed" && !errorMsg && <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">Something went wrong with authentication. Please try again.</div>}

				{/* Account-exists notice from signup redirect */}
				{noticeParam === "account_exists" && !errorMsg && step === "email" && <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm">An account already exists with that email. Sign in below.</div>}

				{/* Password reset success notice */}
				{noticeParam === "password_reset" && !errorMsg && step === "email" && <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">Your password has been updated. Please sign in with your new password.</div>}

				{/* Error banner */}
				{errorMsg && (
					<div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm space-y-1">
						<p>{errorMsg}</p>
						{errorHint && (
							<p className="text-xs text-destructive/70 flex items-center gap-1.5">
								<FontAwesomeIcon icon={faEnvelope} className="text-xs" />
								{errorHint}
							</p>
						)}
					</div>
				)}

				{step === "email" ? (
					/* ── Step 1: Email ── */
					<>
						<div className="mb-8">
							<h1 className="font-display font-bold text-2xl text-foreground mb-2">Welcome Back</h1>
							<p className="text-muted-foreground text-sm">Enter your email to continue.</p>
						</div>

						<Button type="button" variant="outline" className="w-full h-12 rounded-xl text-sm font-medium mb-6" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoading} aria-label="Continue with Google">
							{isGoogleLoading ? <FontAwesomeIcon icon={faSpinner} className="mr-2.5 text-base animate-spin" /> : <FontAwesomeIcon icon={faGoogle} className="mr-2.5 text-base" />}
							Continue with Google
						</Button>

						<div className="relative mb-6">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-card px-3 text-muted-foreground">Or</span>
							</div>
						</div>

						<form onSubmit={handleEmailSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email" className="text-sm font-medium">
									Email
								</Label>
								<Input id="email" type="email" placeholder="eg. johnfrans@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className="h-11 rounded-xl" aria-label="Email address" aria-required="true" autoComplete="email" />
							</div>

							<Button type="submit" className="w-full h-12 rounded-xl text-sm font-semibold mt-2" disabled={isLoading} aria-label={isLoading ? "Looking up your account" : "Continue to password"}>
								{isLoading ? (
									<>
										<FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
										Looking up…
									</>
								) : (
									"Continue"
								)}
							</Button>
						</form>

						<p className="text-center text-sm text-muted-foreground mt-6">
							Don&apos;t have an account?{" "}
							<Link href="/auth/signup" className="text-primary font-semibold hover:underline">
								Sign up
							</Link>
						</p>
					</>
				) : (
					/* ── Step 2: Password (+ optional company selector) ── */
					<>
						{/* Email breadcrumb / back button */}
						<button type="button" onClick={handleBackToEmail} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
							<FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
							<span className="font-medium">{email}</span>
						</button>

						<div className="mb-6">
							<h1 className="font-display font-bold text-2xl text-foreground mb-2">Enter your password</h1>
						</div>

						{/* Show which workspace will be used */}
						{accounts.length >= 1 && selectedWorkspaceId && (
							<p className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
								<FontAwesomeIcon icon={faBuilding} className="text-muted-foreground/60" />
								Signing into <span className="font-semibold text-foreground">{accounts.find((a) => a.workspaceId === selectedWorkspaceId)?.workspaceName}</span>
							</p>
						)}

						<form onSubmit={handleSignIn} className="space-y-4">
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="password" className="text-sm font-medium">
										Password
									</Label>
									<Link href={`/auth/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-xs text-primary hover:underline">
										Forgot password?
									</Link>
								</div>
								<div className="relative">
									<Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus className="h-11 rounded-xl pr-11" aria-label="Password" aria-required="true" autoComplete="current-password" />
									<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
										<FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} className="text-sm" />
									</button>
								</div>
							</div>

							<Button type="submit" className="w-full h-12 rounded-xl text-sm font-semibold mt-2" disabled={isLoading} aria-label={isLoading ? "Signing in" : "Sign in to your account"}>
								{isLoading ? (
									<>
										<FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
										Signing In…
									</>
								) : (
									"Sign In"
								)}
							</Button>
						</form>
					</>
				)}
			</>
		</AuthShell>
	);
}

export default function SignInPage() {
	return (
		<Suspense fallback={null}>
			<SignInPageContent />
		</Suspense>
	);
}
