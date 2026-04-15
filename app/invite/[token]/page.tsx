import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { validateInviteToken } from "@/features/invite/services/inviteService";
import { InviteAcceptForm } from "./invite-accept-form";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const validation = await validateInviteToken(token);

  if (!validation.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">
            {validation.error === "not_found" && "Invalid Invitation"}
            {validation.error === "expired" && "Invitation Expired"}
            {validation.error === "already_accepted" && "Already Joined"}
            {validation.error === "declined" && "Invitation Declined"}
          </h1>
          <p className="text-muted-foreground">
            {validation.error === "not_found" &&
              "This invitation link is invalid."}
            {validation.error === "expired" &&
              "This invitation has expired. Please contact the workspace owner."}
            {validation.error === "already_accepted" &&
              "You have already accepted this invitation."}
            {validation.error === "declined" &&
              "This invitation was declined."}
          </p>
        </div>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const invitation = validation.invitation!;

  // Check if logged-in user's email matches
  if (user) {
    const userEmail = user.email?.toLowerCase().trim();
    const inviteEmail = invitation.email.toLowerCase().trim();

    if (userEmail === inviteEmail) {
      // Auto-accept: same email
      return (
        <InviteAcceptForm
          invitation={invitation}
          isLoggedIn={true}
          emailMatch={true}
        />
      );
    } else {
      // Email mismatch
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Email Mismatch</h1>
            <p className="text-muted-foreground">
              You are logged in as <strong>{userEmail}</strong>, but this
              invitation is for <strong>{inviteEmail}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Please sign out and sign in with the correct email, or ask for a
              new invitation.
            </p>
          </div>
        </div>
      );
    }
  }

  // Not logged in - show signup form
  return (
    <InviteAcceptForm
      invitation={invitation}
      isLoggedIn={false}
      emailMatch={false}
    />
  );
}
