import type {
  SupabaseWorkspaceInvitation,
  SupabaseUser,
  SupabaseWorkspace,
  UserRole,
} from "@/common/types";

export interface InviteWithDetails extends SupabaseWorkspaceInvitation {
  workspace: Pick<SupabaseWorkspace, "id" | "name">;
  inviter: Pick<SupabaseUser, "id" | "first_name" | "last_name" | "email">;
}

export interface CreateInviteParams {
  workspaceId: string;
  email: string;
  role: UserRole;
  managerId?: string;
  invitedBy: string;
}

export interface CreateInviteResult {
  invitation: SupabaseWorkspaceInvitation;
  inviteLink: string;
  userRecord: SupabaseUser;
}

export interface AcceptInviteParams {
  token: string;
  authId: string;
  firstName: string;
  lastName?: string;
  password?: string;
}

export interface InviteValidationResult {
  valid: boolean;
  invitation?: InviteWithDetails;
  error?: "not_found" | "expired" | "already_accepted" | "declined";
}
