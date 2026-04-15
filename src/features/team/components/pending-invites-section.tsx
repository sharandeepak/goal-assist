"use client";

import { useState } from "react";
import { Button } from "@/common/ui/button";
import { Badge } from "@/common/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/ui/alert-dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faXmark, faRotateRight, faCopy, faCheck } from "@fortawesome/free-solid-svg-icons";
import { useToast } from "@/common/hooks/use-toast";
import { cancelInvite, resendInvite } from "@/features/invite/services/inviteService";
import { getPermissionsForRole } from "../types";
import type { InviteWithDetails } from "@/features/invite/types";
import type { UserRole } from "@/common/types";

interface PendingInvitesSectionProps {
  invites: InviteWithDetails[];
  userRole: UserRole;
  currentUserId: string;
  onInviteUpdated: () => void;
}

export function PendingInvitesSection({
  invites,
  userRole,
  currentUserId,
  onInviteUpdated,
}: PendingInvitesSectionProps) {
  const { toast } = useToast();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedInviteId, setSelectedInviteId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const permissions = getPermissionsForRole(userRole);

  const handleCancelClick = (inviteId: string) => {
    setSelectedInviteId(inviteId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedInviteId) return;

    setLoadingId(selectedInviteId);
    try {
      await cancelInvite(selectedInviteId);
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
      onInviteUpdated();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel invitation.",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
      setCancelDialogOpen(false);
      setSelectedInviteId(null);
    }
  };

  const handleResend = async (inviteId: string) => {
    setLoadingId(inviteId);
    try {
      const newLink = await resendInvite(inviteId);
      toast({
        title: "Invitation resent",
        description: "The invitation has been resent with a new expiration date.",
      });

      // Copy the new link to clipboard
      try {
        await navigator.clipboard.writeText(newLink);
        setCopiedId(inviteId);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        // Ignore clipboard errors
      }

      onInviteUpdated();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend invitation.",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleCopyLink = async (token: string, inviteId: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const link = `${baseUrl}/invite/${token}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(inviteId);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Link copied",
        description: "Invite link copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const canManageInvite = (invite: InviteWithDetails): boolean => {
    // Admin can manage all invites
    if (permissions.canCancelInvite) return true;
    // Inviter can manage their own invites
    return invite.invited_by === currentUserId;
  };

  if (invites.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FontAwesomeIcon icon={faEnvelope} className="h-5 w-5" />
            Pending Invitations ({invites.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invites.map((invite) => {
              const isLoading = loadingId === invite.id;
              const isCopied = copiedId === invite.id;
              const canManage = canManageInvite(invite);
              const expiresAt = new Date(invite.expires_at);
              const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{invite.email}</span>
                      <Badge variant="secondary">{invite.role}</Badge>
                      {isExpiringSoon && (
                        <Badge variant="destructive" className="text-xs">
                          Expires soon
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Invited by {invite.inviter.first_name} {invite.inviter.last_name || ""} &middot;{" "}
                      Expires {expiresAt.toLocaleDateString()}
                    </p>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopyLink(invite.token, invite.id)}
                        disabled={isLoading}
                        title="Copy invite link"
                      >
                        <FontAwesomeIcon
                          icon={isCopied ? faCheck : faCopy}
                          className="h-4 w-4"
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleResend(invite.id)}
                        disabled={isLoading}
                        title="Resend invitation"
                      >
                        <FontAwesomeIcon
                          icon={faRotateRight}
                          className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleCancelClick(invite.id)}
                        disabled={isLoading}
                        title="Cancel invitation"
                      >
                        <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invitation? The invitee will no longer be able to join using this link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={loadingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loadingId ? "Cancelling..." : "Cancel Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
