import type { SupabaseUser, UserRole } from "@/common/types";
import { AppError } from "@/common/errors/AppError";
import { supabaseInviteRepository } from "../repository/supabaseInviteRepository";
import { addManagerRelationship } from "@/features/team/services/hierarchyService";
import type {
  CreateInviteParams,
  CreateInviteResult,
  InviteValidationResult,
  InviteWithDetails
} from "../types";
import { createClient } from "@/common/lib/supabase/client";

const inviteRepository = supabaseInviteRepository;

export function canInvite(inviter: SupabaseUser, targetRole: UserRole): boolean {
  if (inviter.role === "admin") return true;
  if (inviter.role === "manager" && targetRole === "member") return true;
  return false;
}

export async function createInvite(params: CreateInviteParams): Promise<CreateInviteResult> {
  const { workspaceId, email, role, managerId, invitedBy } = params;
  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing active user
  const hasActiveUser = await inviteRepository.checkActiveUserInWorkspace(workspaceId, normalizedEmail);
  if (hasActiveUser) {
    throw AppError.conflict("INVITE_USER_EXISTS", "A user with this email already exists in the workspace.");
  }

  // Check for existing pending invite
  const hasPendingInvite = await inviteRepository.checkDuplicateInvite(workspaceId, normalizedEmail);
  if (hasPendingInvite) {
    throw AppError.conflict("INVITE_DUPLICATE", "A pending invitation already exists for this email.");
  }

  // Create the invitation record
  const invitation = await inviteRepository.createInvitation({
    workspace_id: workspaceId,
    email: normalizedEmail,
    role,
    manager_id: managerId,
    invited_by: invitedBy,
    status: "pending",
  });

  // Create the invited user record (status: 'invited', no auth_id yet)
  const userRecord = await inviteRepository.createInvitedUser({
    workspace_id: workspaceId,
    email: normalizedEmail,
    first_name: normalizedEmail.split("@")[0], // Placeholder, updated on accept
    role,
    status: "invited",
    manager_id: managerId,
  });

  // Generate invite link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/invite/${invitation.token}`;

  // Trigger email if enabled
  if (process.env.INVITE_EMAIL_ENABLED === "true") {
    await triggerInviteEmail(invitation.id, normalizedEmail, inviteLink);
  }

  return { invitation, inviteLink, userRecord };
}

export async function validateInviteToken(token: string): Promise<InviteValidationResult> {
  const invitation = await inviteRepository.getInvitationByToken(token);

  if (!invitation) {
    return { valid: false, error: "not_found" };
  }

  if (invitation.status === "accepted") {
    return { valid: false, error: "already_accepted", invitation };
  }

  if (invitation.status === "declined") {
    return { valid: false, error: "declined", invitation };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    // Auto-update to expired
    await inviteRepository.updateInvitationStatus(invitation.id, "expired");
    return { valid: false, error: "expired", invitation };
  }

  if (invitation.status === "expired") {
    return { valid: false, error: "expired", invitation };
  }

  return { valid: true, invitation };
}

export async function acceptInvite(
  invitationId: string,
  userId: string,
  authId: string
): Promise<void> {
  // Link auth_id to user
  await inviteRepository.linkAuthIdToUser(userId, authId);

  // Activate user
  await inviteRepository.activateUser(userId);

  // Mark invitation as accepted
  await inviteRepository.updateInvitationStatus(invitationId, "accepted");
}

export async function acceptInviteForUser(
  invitationId: string,
  _email: string,
  _workspaceId: string,
  authId: string,
  firstName?: string,
  lastName?: string
): Promise<void> {
  // Atomically link auth_id, activate the user, and mark the invitation
  // accepted — all via a SECURITY DEFINER RPC that bypasses the RLS policies
  // which block browser-client UPDATEs when auth_id is still NULL. The RPC
  // also returns user_id, manager_id, and workspace_id so we can run the
  // hierarchy step without a pre-flight SELECT on users (which RLS would
  // block until the caller is an active member of the invited workspace).
  const { userId, managerId, workspaceId } = await inviteRepository.acceptInviteViaRpc(
    invitationId,
    authId,
    firstName,
    lastName
  );

  if (managerId) {
    try {
      await addManagerRelationship(managerId, userId, workspaceId);
    } catch (error) {
      // Non-fatal: manager_id is already set on the users row.
      console.error("Failed to add hierarchy relationship:", error);
    }
  }
}

export async function declineInvite(invitationId: string, userId: string): Promise<void> {
  // Mark invitation as declined
  await inviteRepository.updateInvitationStatus(invitationId, "declined");

  // Delete the invited user record
  await inviteRepository.deleteInvitedUser(userId);
}

export async function declineInviteForUser(
  invitationId: string,
  email: string,
  workspaceId: string
): Promise<void> {
  const invitedUser = await inviteRepository.findInvitedUserByEmail(email, workspaceId);
  if (!invitedUser) {
    throw AppError.notFound("INVITE_USER_NOT_FOUND", "Invited user record not found");
  }
  await declineInvite(invitationId, invitedUser.id);
}

export async function getPendingInvitesForEmail(email: string): Promise<InviteWithDetails[]> {
  return inviteRepository.getPendingInvitationsForEmail(email);
}

export async function getPendingInvitesForWorkspace(workspaceId: string): Promise<InviteWithDetails[]> {
  return inviteRepository.getPendingInvitationsForWorkspace(workspaceId);
}

export async function cancelInvite(invitationId: string): Promise<void> {
  await inviteRepository.cancelInvitation(invitationId);
}

export async function revokeInvitesByMember(memberId: string, workspaceId: string): Promise<void> {
  await inviteRepository.revokeInvitationsByInviter(memberId, workspaceId);
}

export async function revokeInviteByEmail(email: string, workspaceId: string): Promise<void> {
  await inviteRepository.revokeInvitationByEmail(email, workspaceId);
}

export async function resendInvite(invitationId: string): Promise<string> {
  const supabase = createClient();

  // Get the invitation
  const { data: invitation, error } = await supabase
    .from("workspace_invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (error || !invitation) {
    throw AppError.notFound("INVITE_NOT_FOUND", "Invitation not found.");
  }

  // Reset expiration
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  await supabase
    .from("workspace_invitations")
    .update({
      expires_at: newExpiresAt.toISOString(),
      status: "pending"
    })
    .eq("id", invitationId);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${baseUrl}/invite/${invitation.token}`;

  // Trigger email if enabled
  if (process.env.INVITE_EMAIL_ENABLED === "true") {
    await triggerInviteEmail(invitationId, invitation.email, inviteLink);
  }

  return inviteLink;
}

async function triggerInviteEmail(
  invitationId: string,
  email: string,
  inviteLink: string
): Promise<void> {
  const supabase = createClient();

  try {
    await supabase.functions.invoke("send-invite-email", {
      body: { invitationId, email, inviteLink },
    });
  } catch (error) {
    console.error("Failed to send invite email:", error);
    // Don't throw - email is optional, invite still works via link
  }
}
