"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import { createWorkspaceAndUser } from "@/features/auth/services/authService";
import { useAuth } from "@/common/providers/auth-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupError = searchParams.get("error") === "setup_failed";

  const { authUser } = useAuth();
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      setError("Workspace name is required");
      return;
    }

    if (!authUser) {
      setError("You must be logged in to create a workspace");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await createWorkspaceAndUser(
        workspaceName.trim(),
        authUser.id,
        authUser.email!,
        authUser.user_metadata?.first_name || "User",
        authUser.user_metadata?.last_name || ""
      );

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create workspace"
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      {/* Left Sidebar - Branding */}
      <div className="w-full md:w-[480px] bg-card border-r border-border p-8 flex flex-col justify-between relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <FontAwesomeIcon icon={faBuilding} className="text-xl" />
            </div>
            <span className="text-xl font-display font-bold">Goal Assist</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-display font-bold text-foreground">
              Set up your workspace
            </h1>
            <p className="text-muted-foreground text-lg max-w-sm">
              Create a hub for your team and their goals.
            </p>
          </div>
        </div>

        <div className="relative z-10 hidden md:block">
          <div className="p-6 rounded-2xl bg-muted/50 border border-border/50 backdrop-blur-sm">
            <h3 className="font-semibold mb-2">Almost there!</h3>
            <p className="text-sm text-muted-foreground">
              Your workspace is where you and your team will track milestones
              and daily tasks.
            </p>
          </div>
        </div>
      </div>

      {/* Right Content - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {setupError && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm flex items-start gap-3">
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="text-amber-500 mt-0.5 shrink-0"
              />
              <span>
                We couldn&apos;t automatically set up your workspace. Please
                enter your workspace name below.
              </span>
            </div>
          )}

          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl font-semibold tracking-tight">
              Workspace details
            </h2>
            <p className="text-muted-foreground">
              What should we call your workspace?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace Name</Label>
              <Input
                id="workspaceName"
                placeholder="e.g. Acme Corp"
                type="text"
                autoCapitalize="words"
                autoComplete="organization"
                autoCorrect="off"
                disabled={isLoading}
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
                className="h-12 bg-muted/50"
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                {error}
              </div>
            )}

            <Button
              className="w-full h-12 text-base font-medium transition-all"
              type="submit"
              disabled={isLoading || !workspaceName.trim()}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  <span>Creating workspace...</span>
                </div>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageContent />
    </Suspense>
  );
}
