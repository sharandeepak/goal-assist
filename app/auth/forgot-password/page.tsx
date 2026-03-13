"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullseye,
  faEnvelopeOpenText,
  faCircleCheck,
  faArrowLeft,
  faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import { createClient } from "@/common/lib/supabase/client";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
        }
      );
      if (supabaseError) throw supabaseError;
      // Always show confirmation — never reveal whether email is registered
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(167,139,250,0.3),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(192,132,252,0.15),transparent_60%)]" />
        <div className="absolute top-0 left-0 right-0 h-64 opacity-40">
          <div className="absolute top-8 left-12 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl" />
          <div className="absolute top-20 right-8 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col h-full p-10">
          <div className="flex items-center gap-3 mb-auto">
            <div className="flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
              <FontAwesomeIcon icon={faBullseye} className="text-white text-lg" />
            </div>
            <span className="font-display font-bold text-xl text-white tracking-tight">
              Goal Assist
            </span>
          </div>
          <div className="flex flex-col items-center text-center my-auto">
            <h2 className="font-display font-bold text-3xl text-white mb-3 leading-tight">
              Reset your password
            </h2>
            <p className="text-white/60 text-base max-w-[280px] leading-relaxed">
              Enter your email and we&apos;ll send you a secure link to get back into your account.
            </p>
          </div>
          <div className="mt-auto" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[440px]">
          {submitted ? (
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
                Check your inbox
              </h1>
              <p className="text-muted-foreground text-sm max-w-[320px] leading-relaxed mb-2">
                If an account exists for
              </p>
              <p className="font-semibold text-foreground text-sm mb-6 px-4 py-2 bg-muted rounded-xl">
                {email}
              </p>
              <p className="text-muted-foreground text-xs max-w-[280px] leading-relaxed mb-6">
                you&apos;ll receive a password reset link shortly. Click it to choose a new password.
              </p>
              {email.toLowerCase().endsWith("@gmail.com") && (
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mb-6 block"
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl text-sm font-semibold gap-2.5"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path d="M22 6.5V17.5C22 18.88 20.88 20 19.5 20H4.5C3.12 20 2 18.88 2 17.5V6.5C2 5.12 3.12 4 4.5 4H19.5C20.88 4 22 5.12 22 6.5Z" fill="#F6F6F6" stroke="#E0E0E0" strokeWidth="0.5"/>
                      <path d="M2 6.5L12 13L22 6.5" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M2 6.5V17.5C2 18.88 3.12 20 4.5 20H6V9L12 13L18 9V20H19.5C20.88 20 22 18.88 22 17.5V6.5L12 13L2 6.5Z" fill="url(#gmail-gradient)"/>
                      <defs>
                        <linearGradient id="gmail-gradient" x1="2" y1="13" x2="22" y2="13">
                          <stop stopColor="#4285F4"/>
                          <stop offset="0.33" stopColor="#34A853"/>
                          <stop offset="0.66" stopColor="#FBBC04"/>
                          <stop offset="1" stopColor="#EA4335"/>
                        </linearGradient>
                      </defs>
                    </svg>
                    Open Gmail
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs text-muted-foreground" />
                  </Button>
                </a>
              )}
              <div className="pt-6 border-t border-border w-full text-center">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Back to sign in
                </Link>
                <h1 className="font-display font-bold text-2xl text-foreground mb-2">
                  Forgot your password?
                </h1>
                <p className="text-muted-foreground text-sm">
                  Enter your email address and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-sm font-semibold mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
