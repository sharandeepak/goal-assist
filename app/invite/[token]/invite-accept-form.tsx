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
import { acceptInvite } from "@/features/invite/services/inviteService";
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
        if (!user) throw new Error("Not authenticated");

        // Find the invited user record
        const { data: invitedUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", invitation.email)
          .eq("workspace_id", invitation.workspace_id)
          .eq("status", "invited")
          .single();

        if (!invitedUser) throw new Error("User record not found");

        await acceptInvite(invitation.id, invitedUser.id, user.id);
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
          setError("Failed to create account");
          setIsLoading(false);
          return;
        }

        // Find and update the invited user record
        const { data: invitedUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", invitation.email)
          .eq("workspace_id", invitation.workspace_id)
          .eq("status", "invited")
          .single();

        if (!invitedUser) throw new Error("User record not found");

        // Update user with name
        await supabase
          .from("users")
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim() || null,
          })
          .eq("id", invitedUser.id);

        await acceptInvite(invitation.id, invitedUser.id, authData.user.id);
        router.push("/");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
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
