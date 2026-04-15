import { createClient } from "@/common/lib/supabase/client";
import type {
  SupabaseWorkspaceInvitation,
  SupabaseWorkspaceInvitationInsert,
  SupabaseUser,
  SupabaseUserInsert
} from "@/common/types";
import type { InviteRepository } from "./inviteRepository";
import type { InviteWithDetails } from "../types";
import { AppError } from "@/common/errors/AppError";

class SupabaseInviteRepository implements InviteRepository {
  private get supabase() {
    return createClient();
  }

  async getInvitationByToken(token: string): Promise<InviteWithDetails | null> {
    const { data, error } = await this.supabase
      .from("workspace_invitations")
      .select(`
        *,
        workspace:workspaces(id, name),
        inviter:users!workspace_invitations_invited_by_fkey(id, first_name, last_name, email)
      `)
      .eq("token", token)
      .maybeSingle();

    if (error) {
      throw AppError.internal("INVITE_FETCH_ERROR", "Failed to fetch invitation.");
    }

    return data as InviteWithDetails | null;
  }

  async getPendingInvitationsForEmail(email: string): Promise<InviteWithDetails[]> {
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await this.supabase
      .from("workspace_invitations")
      .select(`
        *,
        workspace:workspaces(id, name),
        inviter:users!workspace_invitations_invited_by_fkey(id, first_name, last_name, email)
      `)
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    if (error) {
      throw AppError.internal("INVITE_FETCH_ERROR", "Failed to fetch pending invitations.");
    }

    return (data ?? []) as InviteWithDetails[];
  }

  async getPendingInvitationsForWorkspace(workspaceId: string): Promise<InviteWithDetails[]> {
    const { data, error } = await this.supabase
      .from("workspace_invitations")
      .select(`
        *,
        workspace:workspaces(id, name),
        inviter:users!workspace_invitations_invited_by_fkey(id, first_name, last_name, email)
      `)
      .eq("workspace_id", workspaceId)
      .eq("status", "pending");

    if (error) {
      throw AppError.internal("INVITE_FETCH_ERROR", "Failed to fetch workspace invitations.");
    }

    return (data ?? []) as InviteWithDetails[];
  }

  async getInvitationsByWorkspace(workspaceId: string): Promise<InviteWithDetails[]> {
    const { data, error } = await this.supabase
      .from("workspace_invitations")
      .select(`
        *,
        workspace:workspaces(id, name),
        inviter:users!workspace_invitations_invited_by_fkey(id, first_name, last_name, email)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw AppError.internal("INVITE_FETCH_ERROR", "Failed to fetch workspace invitations.");
    }

    return (data ?? []) as InviteWithDetails[];
  }

  async checkDuplicateInvite(workspaceId: string, email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const { count, error } = await this.supabase
      .from("workspace_invitations")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("email", normalizedEmail)
      .eq("status", "pending");

    if (error) {
      throw AppError.internal("INVITE_CHECK_ERROR", "Failed to check for duplicate invite.");
    }

    return (count ?? 0) > 0;
  }

  async checkActiveUserInWorkspace(workspaceId: string, email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const { count, error } = await this.supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("email", normalizedEmail)
      .eq("status", "active");

    if (error) {
      throw AppError.internal("USER_CHECK_ERROR", "Failed to check for existing user.");
    }

    return (count ?? 0) > 0;
  }

  async createInvitation(data: SupabaseWorkspaceInvitationInsert): Promise<SupabaseWorkspaceInvitation> {
    const { data: invitation, error } = await this.supabase
      .from("workspace_invitations")
      .insert(data)
      .select()
      .single();

    if (error) {
      throw AppError.internal("INVITE_CREATE_ERROR", "Failed to create invitation.");
    }

    return invitation;
  }

  async createInvitedUser(data: SupabaseUserInsert): Promise<SupabaseUser> {
    const { data: user, error } = await this.supabase
      .from("users")
      .insert(data)
      .select()
      .single();

    if (error) {
      throw AppError.internal("USER_CREATE_ERROR", "Failed to create invited user record.");
    }

    return user;
  }

  async updateInvitationStatus(
    invitationId: string,
    status: "accepted" | "declined" | "expired"
  ): Promise<void> {
    const { error } = await this.supabase
      .from("workspace_invitations")
      .update({ status })
      .eq("id", invitationId);

    if (error) {
      throw AppError.internal("INVITE_UPDATE_ERROR", "Failed to update invitation status.");
    }
  }

  async linkAuthIdToUser(userId: string, authId: string): Promise<void> {
    const { error } = await this.supabase
      .from("users")
      .update({ auth_id: authId })
      .eq("id", userId);

    if (error) {
      throw AppError.internal("USER_LINK_ERROR", "Failed to link auth ID to user.");
    }
  }

  async activateUser(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("users")
      .update({ status: "active" })
      .eq("id", userId);

    if (error) {
      throw AppError.internal("USER_ACTIVATE_ERROR", "Failed to activate user.");
    }
  }

  async deleteInvitedUser(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("users")
      .delete()
      .eq("id", userId)
      .eq("status", "invited");

    if (error) {
      throw AppError.internal("USER_DELETE_ERROR", "Failed to delete invited user.");
    }
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await this.supabase
      .from("workspace_invitations")
      .delete()
      .eq("id", invitationId);

    if (error) {
      throw AppError.internal("INVITE_CANCEL_ERROR", "Failed to cancel invitation.");
    }
  }

  async findInvitedUserByEmail(email: string, workspaceId: string): Promise<{ id: string; manager_id: string | null } | null> {
    const { data } = await this.supabase
      .from("users")
      .select("id, manager_id")
      .eq("email", email)
      .eq("workspace_id", workspaceId)
      .eq("status", "invited")
      .single();
    return data;
  }

  async updateUserName(userId: string, firstName: string, lastName: string | null): Promise<void> {
    const { error } = await this.supabase
      .from("users")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", userId);
    if (error) {
      throw AppError.internal("INVITE_UPDATE_NAME", "Failed to update user name");
    }
  }
}

export const supabaseInviteRepository = new SupabaseInviteRepository();
