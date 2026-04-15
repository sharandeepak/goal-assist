"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/common/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/ui/card";
import { acceptInviteForUser, declineInviteForUser } from "@/features/invite/services/inviteService";
import { AppError } from "@/common/errors/AppError";
import type { InviteWithDetails } from "@/features/invite/types";

interface PendingInvitesListProps {
  invites: InviteWithDetails[];
  userAuthId: string;
}

export function PendingInvitesList({ invites, userAuthId }: PendingInvitesListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [remainingInvites, setRemainingInvites] = useState(invites);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async (invite: InviteWithDetails) => {
    setLoadingId(invite.id);
    setError(null);
    try {
      await acceptInviteForUser(
        invite.id,
        invite.email,
        invite.workspace_id,
        userAuthId
      );
      router.push("/");
    } catch (err) {
      const message = err instanceof AppError ? err.errorMessage : "Failed to accept invite";
      setError(message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (invite: InviteWithDetails) => {
    setLoadingId(invite.id);
    setError(null);
    try {
      await declineInviteForUser(invite.id, invite.email, invite.workspace_id);

      const updated = remainingInvites.filter(i => i.id !== invite.id);
      setRemainingInvites(updated);

      if (updated.length === 0) {
        router.push("/onboarding");
      }
    } catch (err) {
      const message = err instanceof AppError ? err.errorMessage : "Failed to decline invite";
      setError(message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateNew = () => {
    router.push("/onboarding");
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {remainingInvites.map((invite) => (
        <Card key={invite.id}>
          <CardHeader>
            <CardTitle>{invite.workspace.name}</CardTitle>
            <CardDescription>
              Invited by {invite.inviter.first_name} {invite.inviter.last_name} as {invite.role}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              onClick={() => handleAccept(invite)}
              disabled={loadingId === invite.id}
            >
              {loadingId === invite.id ? "Accepting..." : "Accept"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDecline(invite)}
              disabled={loadingId === invite.id}
            >
              Decline
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="pt-4 border-t">
        <Button variant="secondary" onClick={handleCreateNew} className="w-full">
          Create New Workspace Instead
        </Button>
      </div>
    </div>
  );
}
