import { createClient } from "@/common/lib/supabase/client";
import { AppError } from "@/common/errors/AppError";
import { supabaseAuthRepository } from "../repository/supabaseAuthRepository";
import type { SupabaseWorkspace, SupabaseUser, AccountInfo } from "@/common/types";

const authRepo = supabaseAuthRepository;

export async function signUpWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  if (!email || !password) {
    throw AppError.badRequest(
      "AUTH_MISSING_FIELDS",
      "Email and password are required."
    );
  }
  if (password.length < 8) {
    throw AppError.badRequest(
      "AUTH_WEAK_PASSWORD",
      "Password must be at least 8 characters."
    );
  }

  const supabase = createClient();
  const redirectTo = `${typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3311"}/auth/callback`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
      },
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("already registered") ||
      msg.includes("already exists") ||
      msg.includes("user already")
    ) {
      throw AppError.conflict(
        "AUTH_EMAIL_EXISTS",
        "An account already exists with this email."
      );
    }
    throw AppError.badRequest("AUTH_SIGNUP_ERROR", error.message);
  }

  if (data.user && data.user.identities?.length === 0) {
    throw AppError.conflict(
      "AUTH_EMAIL_EXISTS",
      "An account already exists with this email."
    );
  }

  return data;
}

export async function signInWithEmail(email: string, password: string) {
  if (!email || !password) {
    throw AppError.badRequest(
      "AUTH_MISSING_FIELDS",
      "Email and password are required."
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw AppError.badRequest("AUTH_SIGNIN_ERROR", error.message);
  }

  return data;
}

export async function signInWithGoogle() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw AppError.badRequest("AUTH_GOOGLE_ERROR", error.message);
  }

  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw AppError.internal("AUTH_SIGNOUT_ERROR", error.message);
  }
}

export async function createWorkspaceAndUser(
  workspaceName: string,
  _authId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<{ workspace: Pick<SupabaseWorkspace, "id" | "name">; user: Pick<SupabaseUser, "id"> }> {
  if (!workspaceName.trim()) {
    throw AppError.badRequest(
      "WORKSPACE_NAME_REQUIRED",
      "Workspace name is required."
    );
  }

  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(
    "create_workspace_and_user",
    {
      p_workspace_name: workspaceName.trim(),
      p_email: email,
      p_first_name: firstName,
      p_last_name: lastName || null,
    }
  );

  if (error) {
    throw AppError.internal("WORKSPACE_CREATE_ERROR", error.message);
  }
  if (!data) {
    throw AppError.internal("WORKSPACE_CREATE_ERROR", "No data returned.");
  }

  const result = data as { workspace_id: string; workspace_name: string; user_id: string };

  return {
    workspace: { id: result.workspace_id, name: result.workspace_name },
    user: { id: result.user_id },
  };
}

export async function inviteUsers(
  workspaceId: string,
  users: { firstName: string; lastName: string; email: string }[]
): Promise<SupabaseUser[]> {
  const validUsers = users.filter(
    (u) => u.email.trim() && u.firstName.trim()
  );

  if (validUsers.length === 0) return [];

  const insertData = validUsers.map((u) => ({
    workspace_id: workspaceId,
    first_name: u.firstName.trim(),
    last_name: u.lastName.trim() || null,
    email: u.email.trim().toLowerCase(),
    role: "member" as const,
    status: "invited" as const,
  }));

  return authRepo.createUsersBatch(insertData);
}

export async function getUserProfile(authId: string, workspaceId?: string) {
  return authRepo.getUserByAuthId(authId, workspaceId);
}

export async function getAccountsByEmail(email: string): Promise<AccountInfo[]> {
  if (!email.trim()) return [];

  try {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("get_accounts_by_email", {
      p_email: email.trim().toLowerCase(),
    });

    if (error) {
      console.error("[getAccountsByEmail] RPC error:", error.message);
      return [];
    }

    const rows = data as { workspace_id: string; workspace_name: string }[] | null;
    return (rows ?? []).map((row) => ({
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
    }));
  } catch (err) {
    console.error("[getAccountsByEmail] Unexpected error:", err);
    return [];
  }
}
