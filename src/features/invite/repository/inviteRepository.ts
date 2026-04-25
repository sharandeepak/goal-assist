import type {
  SupabaseWorkspaceInvitation,
  SupabaseWorkspaceInvitationInsert,
  SupabaseUser,
  SupabaseUserInsert,
} from "@/common/types";
import type { InviteWithDetails } from "../types";

export interface InviteRepository {
  getInvitationByToken(token: string): Promise<InviteWithDetails | null>;

  getPendingInvitationsForEmail(email: string): Promise<InviteWithDetails[]>;

  getPendingInvitationsForWorkspace(
    workspaceId: string
  ): Promise<InviteWithDetails[]>;

  getInvitationsByWorkspace(workspaceId: string): Promise<InviteWithDetails[]>;

  checkDuplicateInvite(workspaceId: string, email: string): Promise<boolean>;

  checkActiveUserInWorkspace(
    workspaceId: string,
    email: string
  ): Promise<boolean>;

  createInvitation(
    data: SupabaseWorkspaceInvitationInsert
  ): Promise<SupabaseWorkspaceInvitation>;

  createInvitedUser(data: SupabaseUserInsert): Promise<SupabaseUser>;

  updateInvitationStatus(
    invitationId: string,
    status: "accepted" | "declined" | "expired"
  ): Promise<void>;

  linkAuthIdToUser(userId: string, authId: string): Promise<void>;

  activateUser(userId: string): Promise<void>;

  deleteInvitedUser(userId: string): Promise<void>;

  cancelInvitation(invitationId: string): Promise<void>;

  revokeInvitationsByInviter(inviterId: string, workspaceId: string): Promise<void>;

  revokeInvitationByEmail(email: string, workspaceId: string): Promise<void>;

  findInvitedUserByEmail(email: string, workspaceId: string): Promise<{ id: string; manager_id: string | null } | null>;

  updateUserName(userId: string, firstName: string, lastName: string | null): Promise<void>;
}
