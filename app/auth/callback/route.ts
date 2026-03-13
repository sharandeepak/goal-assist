import { createClient } from "@/common/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/common/types/database.types";

type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];
type WorkspaceInsert = Database["public"]["Tables"]["workspaces"]["Insert"];
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/signin?error=callback_failed`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/auth/signin?error=callback_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/signin?error=callback_failed`);
  }

  // Check if the user already has an active user record
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single();

  if (existingUser) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No user record yet — try to auto-create from signup metadata
  const workspaceName = user.user_metadata?.workspace_name as string | undefined;
  const firstName = (user.user_metadata?.first_name as string) || "User";
  const lastName = (user.user_metadata?.last_name as string) || "";

  if (workspaceName?.trim()) {
    const workspacePayload: WorkspaceInsert = {
      name: workspaceName.trim(),
      creator_id: user.id,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workspaceData, error: workspaceError } = await (supabase.from("workspaces") as any)
      .insert(workspacePayload)
      .select()
      .single();

    const workspace = workspaceData as WorkspaceRow | null;

    if (workspaceError || !workspace) {
      return NextResponse.redirect(`${origin}/onboarding?error=setup_failed`);
    }

    const userPayload: UserInsert = {
      workspace_id: workspace.id,
      auth_id: user.id,
      first_name: firstName,
      last_name: lastName || null,
      email: user.email!,
      role: "admin",
      status: "active",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: userError } = await (supabase.from("users") as any)
      .insert(userPayload);

    if (userError) {
      return NextResponse.redirect(`${origin}/onboarding?error=setup_failed`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // No workspace_name in metadata (Google OAuth or legacy users) → onboarding
  return NextResponse.redirect(`${origin}/onboarding`);
}
