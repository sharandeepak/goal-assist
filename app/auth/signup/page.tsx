"use client";

import { useState, Suspense, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faEnvelopeOpenText,
  faCircleCheck,
  faRotateRight,
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
import {
  AuthShell,
  AuthHeroBrand,
  AuthHeroHeading,
  StepPill,
  type StepState,
} from "@/features/auth/components/AuthShell";

const signupSteps = [
  { number: 1, label: "Create your account" },
  { number: 2, label: "Verify your email" },
  { number: 3, label: "Set up your workspace" },
];

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
        <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
          <FontAwesomeIcon
            icon={faEnvelopeOpenText}
            className="text-primary text-4xl"
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
        Click the link in the email to verify your account. You&apos;ll set up
        your workspace right after.
      </p>

      <a href={emailUrl} target="_blank" rel="noopener noreferrer" className="w-full">
        <Button className="w-full h-12 rounded-xl text-sm font-semibold">
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
  // step 1 = account details, step 2 = check email
  const [step, setStep] = useState<1 | 2>(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ReactNode>(null);

  // When the user verifies their email in another tab, Supabase broadcasts
  // the SIGNED_IN event — pick it up and redirect to the app.
  useEffect(() => {
    if (step !== 2) return;
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        router.push("/");
      }
    });
    return () => subscription.unsubscribe();
  }, [step, router]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signUpWithEmail(email, password, firstName, lastName);
      setStep(2);
    } catch (err) {
      if (err instanceof AppError && err.errorCode === "AUTH_EMAIL_EXISTS") {
        setError(
          <span>
            An account with this email already exists.{" "}
            <Link
              href={`/auth/signin?email=${encodeURIComponent(email)}`}
              className="font-semibold underline underline-offset-2"
            >
              Sign in instead
            </Link>
          </span>
        );
        return;
      }
      const message =
        err instanceof AppError
          ? err.errorMessage
          : err instanceof Error
            ? err.message
            : "An unexpected error occurred.";
      const lower = message.toLowerCase();
      if (lower.includes("password") || lower.includes("weak")) {
        setError("Password must be at least 8 characters long.");
      } else if (lower.includes("valid email") || lower.includes("invalid email")) {
        setError("Please enter a valid email address.");
      } else if (lower.includes("rate limit") || lower.includes("too many")) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (lower.includes("network") || lower.includes("fetch")) {
        setError("Network error. Check your connection and try again.");
      } else {
        setError(message || "Something went wrong. Please try again.");
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
    <AuthShell
      hero={
        <div className="flex h-full w-full flex-col items-center justify-between gap-10">
          <AuthHeroBrand />
          <div className="flex w-full max-w-[400px] flex-col items-center">
            <AuthHeroHeading
              title="Get Started with Us"
              subtitle="Complete these easy steps to register your account."
            />
          </div>
          <div className="flex w-full max-w-[400px] flex-col gap-3">
            {signupSteps.map((s) => {
              const state: StepState =
                step > s.number ? "done" : step === s.number ? "active" : "upcoming";
              return (
                <StepPill
                  key={s.number}
                  number={s.number}
                  label={s.label}
                  state={state}
                />
              );
            })}
          </div>
        </div>
      }
    >
      <>
        {step === 2 ? (
            <CheckEmailView email={email} />
          ) : (
            /* ── Step 1: Account Details ── */
            <>
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
                  <span className="bg-card px-3 text-muted-foreground">
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
      </>
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpPageContent />
    </Suspense>
  );
}
