"use client";

import { useState } from "react";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import { createClient } from "@/common/lib/supabase/client";
import { acceptInviteForUser } from "@/features/invite/services/inviteService";
import { AppError } from "@/common/errors/AppError";
import type { InviteWithDetails } from "@/features/invite/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import {
  AuthShell,
  AuthHeroBrand,
  AuthHeroHeading,
} from "@/features/auth/components/AuthShell";

interface InviteAcceptFormProps {
  invitation: InviteWithDetails;
  isLoggedIn: boolean;
  emailMatch: boolean;
}

export function InviteAcceptForm({
  invitation,
  isLoggedIn,
  emailMatch,
}: InviteAcceptFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (isLoggedIn && emailMatch) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw AppError.badRequest("INVITE_NOT_AUTHENTICATED", "Not authenticated");
        }
        await acceptInviteForUser(
          invitation.id,
          invitation.email,
          invitation.workspace_id,
          user.id
        );
        window.location.href = "/";
        return;
      } else {
        if (!firstName.trim()) {
          setError("First name is required");
          setIsLoading(false);
          return;
        }
        if (!password || password.length < 6) {
          setError("Password must be at least 6 characters");
          setIsLoading(false);
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: invitation.email,
          password,
        });

        const userAlreadyExists =
          authError?.message?.toLowerCase().includes("already registered") ||
          authError?.message?.toLowerCase().includes("already exists") ||
          authError?.message?.toLowerCase().includes("user already") ||
          (!authError && authData.user?.identities?.length === 0);

        let resolvedUserId: string | null = null;

        if (userAlreadyExists) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: invitation.email,
              password,
            });

          if (signInError || !signInData.user) {
            setError(
              "An account already exists with this email. Please enter your existing password to join, or sign in from the login page."
            );
            setIsLoading(false);
            return;
          }

          resolvedUserId = signInData.user.id;
        } else if (authError) {
          setError(authError.message);
          setIsLoading(false);
          return;
        } else if (!authData.user) {
          throw AppError.internal("INVITE_SIGNUP_FAILED", "Failed to create account");
        } else {
          resolvedUserId = authData.user.id;
        }

        await acceptInviteForUser(
          invitation.id,
          invitation.email,
          invitation.workspace_id,
          resolvedUserId!,
          firstName.trim(),
          lastName.trim() || undefined
        );
        window.location.href = "/";
        return;
      }
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.errorMessage);
      } else {
        setError(err instanceof Error ? err.message : "Failed to accept invitation");
      }
    } finally {
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
              title="You're Invited!"
              subtitle={`${invitation.inviter.first_name} ${invitation.inviter.last_name} has invited you to join ${invitation.workspace.name}.`}
            />
          </div>
          <div className="w-full max-w-[400px] rounded-[12px] bg-muted border border-border px-6 py-5">
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              You&apos;re joining as a{" "}
              <span className="font-semibold text-foreground capitalize">
                {invitation.role}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {invitation.workspace.name}
              </span>
              . Complete the form to get started.
            </p>
          </div>
        </div>
      }
    >
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-foreground mb-2">
          Join {invitation.workspace.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          {invitation.inviter.first_name} {invitation.inviter.last_name} invited
          you to join as a {invitation.role}.
        </p>
      </div>

      <div className="space-y-4">
        {!isLoggedIn && (
          <>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="h-11 rounded-xl opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="eg. John"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="eg. Doe"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  minLength={6}
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
          </>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <Button
          onClick={handleAccept}
          disabled={isLoading}
          className="w-full h-12 rounded-xl text-sm font-semibold mt-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              Joining…
            </span>
          ) : (
            "Accept Invitation"
          )}
        </Button>
      </div>
    </AuthShell>
  );
}
