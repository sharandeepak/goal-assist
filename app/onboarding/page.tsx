"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import { createWorkspaceAndUser } from "@/features/auth/services/authService";
import { useAuth } from "@/common/providers/auth-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import {
  AuthShell,
  AuthHeroBrand,
  AuthHeroHeading,
  StepPill,
  type StepState,
} from "@/features/auth/components/AuthShell";

const onboardingSteps = [
  { number: 1, label: "Create your account" },
  { number: 2, label: "Verify your email" },
  { number: 3, label: "Set up your workspace" },
];

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupError = searchParams.get("error") === "setup_failed";

  const { authUser, refreshProfile } = useAuth();
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

      await refreshProfile();
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create workspace"
      );
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
              title="Almost there!"
              subtitle="One last step — name your workspace and you're in."
            />
          </div>
          <div className="flex w-full max-w-[400px] flex-col gap-3">
            {onboardingSteps.map((s) => {
              const state: StepState =
                s.number < 3 ? "done" : "active";
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
        {setupError && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm flex items-start gap-3">
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

        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl text-foreground mb-2">
            Set up your workspace
          </h1>
          <p className="text-muted-foreground text-sm">
            Create a hub where you and your team can track goals together.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspaceName" className="text-sm font-medium">
              Workspace Name
            </Label>
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
              className="h-11 rounded-xl"
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <Button
            className="w-full h-12 rounded-xl text-sm font-semibold mt-2"
            type="submit"
            disabled={isLoading || !workspaceName.trim()}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                Creating workspace…
              </span>
            ) : (
              "Complete Setup"
            )}
          </Button>
        </form>
      </>
    </AuthShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageContent />
    </Suspense>
  );
}
