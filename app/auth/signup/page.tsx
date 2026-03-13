"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullseye,
  faEye,
  faEyeSlash,
  faEnvelopeOpenText,
  faCircleCheck,
  faRotateRight,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import {
  signUpWithEmail,
  signInWithGoogle,
} from "@/features/auth/services/authService";
import { createClient } from "@/common/lib/supabase/client";
import { AppError } from "@/common/errors/AppError";

// ─── Step Indicator ────────────────────────────────────────────────
const steps = [
  { number: 1, label: "Name your workspace" },
  { number: 2, label: "Create your account" },
  { number: 3, label: "Verify your email" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mt-10 w-full max-w-[320px] space-y-3">
      {steps.map((s) => {
        const isActive = currentStep === s.number;
        const isDone = currentStep > s.number;
        return (
          <div
            key={s.number}
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${
              isActive
                ? "bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg shadow-purple-500/10"
                : isDone
                  ? "bg-white/5 border border-white/5"
                  : "bg-transparent border border-transparent"
            }`}
          >
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 transition-all duration-300 ${
                isActive
                  ? "bg-white text-purple-900"
                  : isDone
                    ? "bg-green-400/80 text-white"
                    : "bg-white/10 text-white/40 border border-white/10"
              }`}
            >
              {isDone ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                s.number
              )}
            </div>
            <span
              className={`text-sm font-medium transition-colors duration-300 ${
                isActive ? "text-white" : isDone ? "text-white/50" : "text-white/30"
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Check Email View ───────────────────────────────────────────────
function CheckEmailView({ email }: { email: string }) {
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">(
    "idle"
  );
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async () => {
    setResendStatus("sending");
    setResendError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setResendStatus("sent");
    } catch {
      setResendError("Could not resend email. Please try again in a minute.");
      setResendStatus("idle");
    }
  };

  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  const emailUrl =
    emailDomain.includes("outlook") ||
    emailDomain.includes("hotmail") ||
    emailDomain.includes("live")
      ? "https://outlook.live.com/mail/"
      : emailDomain.includes("yahoo")
        ? "https://mail.yahoo.com/"
        : "https://mail.google.com/";

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 flex items-center justify-center shadow-xl shadow-violet-200/50 dark:shadow-violet-900/30">
          <FontAwesomeIcon
            icon={faEnvelopeOpenText}
            className="text-violet-600 dark:text-violet-400 text-4xl"
          />
        </div>
        <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
          <FontAwesomeIcon icon={faCircleCheck} className="text-white text-lg" />
        </div>
      </div>

      <h1 className="font-display font-bold text-2xl text-foreground mb-2">
        Check your inbox!
      </h1>
      <p className="text-muted-foreground text-sm max-w-[320px] leading-relaxed mb-2">
        We&apos;ve sent a verification link to
      </p>
      <p className="font-semibold text-foreground text-sm mb-8 px-4 py-2 bg-muted rounded-xl">
        {email}
      </p>

      <p className="text-muted-foreground text-xs mb-6 max-w-[280px] leading-relaxed">
        Click the link in the email to verify your account. Your workspace will
        be created automatically once you verify.
      </p>

      <a href={emailUrl} target="_blank" rel="noopener noreferrer" className="w-full">
        <Button className="w-full h-12 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/25">
          Open Email
        </Button>
      </a>

      <div className="mt-5 text-center">
        {resendStatus === "sent" ? (
          <p className="text-green-600 dark:text-green-400 text-sm font-medium">
            ✓ Email resent successfully!
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendStatus === "sending"}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon
              icon={faRotateRight}
              className={`text-xs ${resendStatus === "sending" ? "animate-spin" : ""}`}
            />
            {resendStatus === "sending"
              ? "Resending…"
              : "Resend verification email"}
          </button>
        )}
        {resendError && (
          <p className="text-destructive text-xs mt-2">{resendError}</p>
        )}
      </div>

      <div className="mt-8 pt-8 border-t border-border w-full">
        <p className="text-sm text-muted-foreground">
          Wrong email?{" "}
          <Link
            href="/auth/signup"
            className="text-primary font-semibold hover:underline"
          >
            Start over
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Signup Form ────────────────────────────────────────────────────
function SignUpPageContent() {
  const router = useRouter();
  // step 1 = workspace name, 2 = personal info + password, 3 = check email
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [workspaceName, setWorkspaceName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When the user verifies their email in another tab, Supabase broadcasts
  // the SIGNED_IN event — pick it up and redirect to the app.
  useEffect(() => {
    if (step !== 3) return;
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Callback handles company creation automatically; just go to root.
        router.push("/");
      }
    });
    return () => subscription.unsubscribe();
  }, [step, router]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      setError("Workspace name is required.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signUpWithEmail(email, password, firstName, lastName, workspaceName);
      setStep(3);
    } catch (err) {
      if (err instanceof AppError && err.errorCode === "AUTH_EMAIL_EXISTS") {
        router.push(
          `/auth/signin?email=${encodeURIComponent(email)}&notice=account_exists`
        );
        return;
      }
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      if (message.toLowerCase().includes("password")) {
        setError("Password must be at least 8 characters long.");
      } else if (message.toLowerCase().includes("email")) {
        setError("Please enter a valid email address.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left Panel ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(167,139,250,0.3),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(192,132,252,0.15),transparent_60%)]" />

        <div className="absolute top-0 left-0 right-0 h-64 opacity-40">
          <div className="absolute top-8 left-12 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl" />
          <div className="absolute top-20 right-8 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full p-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
              <FontAwesomeIcon icon={faBullseye} className="text-white text-lg" />
            </div>
            <span className="font-display font-bold text-xl text-white tracking-tight">
              Goal Assist
            </span>
          </div>

          <div className="flex flex-col items-center text-center my-auto">
            <h2 className="font-display font-bold text-3xl text-white mb-3 leading-tight">
              Get Started with Us
            </h2>
            <p className="text-white/60 text-base max-w-[280px] leading-relaxed">
              Complete these easy steps to set up your workspace.
            </p>
            <StepIndicator currentStep={step} />
          </div>

          <div className="mt-auto" />
        </div>
      </div>

      {/* ── Right Panel ────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-[440px]">
          {step === 3 ? (
            <CheckEmailView email={email} />
          ) : step === 1 ? (
            /* ── Step 1: Workspace Name ── */
            <>
              <div className="mb-8">
                <h1 className="font-display font-bold text-2xl text-foreground mb-2">
                  Name your workspace
                </h1>
                <p className="text-muted-foreground text-sm">
                  This is usually your team or organization name.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspaceName" className="text-sm font-medium">
                    Workspace Name
                  </Label>
                  <Input
                    id="workspaceName"
                    placeholder="e.g. Acme Corp"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    required
                    autoFocus
                    className="h-11 rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-sm font-semibold mt-2"
                >
                  Continue
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            /* ── Step 2: Account Details ── */
            <>
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                <span className="font-medium truncate max-w-[260px]">
                  {workspaceName}
                </span>
              </button>

              <div className="mb-8">
                <h1 className="font-display font-bold text-2xl text-foreground mb-2">
                  Create your account
                </h1>
                <p className="text-muted-foreground text-sm">
                  Enter your details to get started with Goal Assist.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl text-sm font-medium mb-6"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faGoogle} className="mr-2.5 text-base" />
                Continue with Google
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="eg. John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="eg. Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="eg. john@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="h-11 rounded-xl pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <FontAwesomeIcon
                        icon={showPassword ? faEye : faEyeSlash}
                        className="text-sm"
                      />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-sm font-semibold mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account…" : "Create Account"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpPageContent />
    </Suspense>
  );
}
