"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/common/ui/button";
import { Input } from "@/common/ui/input";
import { Label } from "@/common/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/ui/card";
import { createClient } from "@/common/lib/supabase/client";
import { acceptInviteForUser } from "@/features/invite/services/inviteService";
import { AppError } from "@/common/errors/AppError";
import type { InviteWithDetails } from "@/features/invite/types";

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
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (isLoggedIn && emailMatch) {
        // Already logged in with matching email - just accept
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
        router.push("/");
      } else {
        // New signup
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

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: invitation.email,
            password,
          }
        );

        if (authError) {
          setError(authError.message);
          setIsLoading(false);
          return;
        }

        if (!authData.user) {
          throw AppError.internal("INVITE_SIGNUP_FAILED", "Failed to create account");
        }

        await acceptInviteForUser(
          invitation.id,
          invitation.email,
          invitation.workspace_id,
          authData.user.id,
          firstName.trim(),
          lastName.trim() || undefined
        );
        router.push("/");
      }
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.errorMessage);
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to accept invitation"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join {invitation.workspace.name}</CardTitle>
          <CardDescription>
            {invitation.inviter.first_name} {invitation.inviter.last_name}{" "}
            invited you to join as a {invitation.role}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLoggedIn && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation.email}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name (optional)</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Joining..." : "Accept Invitation"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
