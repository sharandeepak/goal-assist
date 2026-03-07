"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import {
  signInWithEmail,
  signInWithGoogle,
} from "@/features/auth/services/authService";

export default function SignInPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signInWithEmail(email, password);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign in failed. Please try again."
      );
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
      setError(
        err instanceof Error ? err.message : "Google sign in failed."
      );
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
              <FontAwesomeIcon
                icon={faBullseye}
                className="text-white text-lg"
              />
            </div>
            <span className="font-display font-bold text-xl text-white tracking-tight">
              Goal Assist
            </span>
          </div>

          <div className="flex flex-col items-center text-center my-auto">
            <h2 className="font-display font-bold text-3xl text-white mb-3 leading-tight">
              Welcome Back
            </h2>
            <p className="text-white/60 text-base max-w-[280px] leading-relaxed">
              Sign in to continue tracking your goals and managing your team.
            </p>

            <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-[280px]">
              {[
                { value: "10K+", label: "Active Users" },
                { value: "50K+", label: "Goals Tracked" },
                { value: "99%", label: "Uptime" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display font-bold text-xl text-white">
                    {stat.value}
                  </div>
                  <div className="text-white/40 text-xs mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[440px]">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="mb-8">
            <h1 className="font-display font-bold text-2xl text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to access your workspace.
            </p>
          </div>

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

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="eg. johnfrans@gmail.com"
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-sm font-semibold mt-2"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-primary font-semibold hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
