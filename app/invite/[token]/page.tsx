import { createClient } from "@/common/lib/supabase/server";
import { validateInviteToken } from "@/features/invite/services/inviteService";
import { InviteAcceptForm } from "./invite-accept-form";
import {
  AuthShell,
  AuthHeroBrand,
  AuthHeroHeading,
} from "@/features/auth/components/AuthShell";
import Link from "next/link";
import { Button } from "@/common/ui/button";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  not_found: {
    title: "Invalid Invitation",
    body: "This invitation link is invalid or has been removed.",
  },
  expired: {
    title: "Invitation Expired",
    body: "This invitation has expired. Please contact the workspace owner to request a new one.",
  },
  already_accepted: {
    title: "Already Joined",
    body: "You have already accepted this invitation. Sign in to continue.",
  },
  declined: {
    title: "Invitation Declined",
    body: "This invitation was declined.",
  },
};

function InviteErrorShell({ errorKey }: { errorKey: string }) {
  const copy = ERROR_COPY[errorKey] ?? ERROR_COPY.not_found;
  return (
    <AuthShell
      hero={
        <div className="flex h-full w-full flex-col items-center justify-between gap-10">
          <AuthHeroBrand />
          <div className="flex w-full max-w-[400px] flex-col items-center">
            <AuthHeroHeading
              title="Goal Assist"
              subtitle="Track goals together with your team."
            />
          </div>
          <div className="w-full max-w-[400px]" />
        </div>
      }
    >
      <div className="flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-destructive"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground mb-2">
            {copy.title}
          </h1>
          <p className="text-muted-foreground text-sm max-w-[320px] leading-relaxed">
            {copy.body}
          </p>
        </div>
        <Link href="/auth/signin" className="w-full">
          <Button className="w-full h-12 rounded-xl text-sm font-semibold">
            Go to Sign In
          </Button>
        </Link>
      </div>
    </AuthShell>
  );
}

function EmailMismatchShell({
  userEmail,
  inviteEmail,
}: {
  userEmail: string;
  inviteEmail: string;
}) {
  return (
    <AuthShell
      hero={
        <div className="flex h-full w-full flex-col items-center justify-between gap-10">
          <AuthHeroBrand />
          <div className="flex w-full max-w-[400px] flex-col items-center">
            <AuthHeroHeading
              title="Goal Assist"
              subtitle="Track goals together with your team."
            />
          </div>
          <div className="w-full max-w-[400px]" />
        </div>
      }
    >
      <div className="flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-amber-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground mb-2">
            Email Mismatch
          </h1>
          <p className="text-muted-foreground text-sm max-w-[320px] leading-relaxed">
            You are signed in as{" "}
            <span className="font-semibold text-foreground">{userEmail}</span>,
            but this invitation is for{" "}
            <span className="font-semibold text-foreground">{inviteEmail}</span>.
          </p>
          <p className="text-muted-foreground text-xs mt-3 max-w-[300px] leading-relaxed">
            Sign out and sign in with the correct email, or ask the workspace
            owner to re-send the invitation.
          </p>
        </div>
        <Link href="/auth/signin" className="w-full">
          <Button className="w-full h-12 rounded-xl text-sm font-semibold">
            Go to Sign In
          </Button>
        </Link>
      </div>
    </AuthShell>
  );
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const validation = await validateInviteToken(token);

  if (!validation.valid) {
    return <InviteErrorShell errorKey={validation.error ?? "not_found"} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const invitation = validation.invitation!;

  if (user) {
    const userEmail = user.email?.toLowerCase().trim() ?? "";
    const inviteEmail = invitation.email.toLowerCase().trim();

    if (userEmail === inviteEmail) {
      return (
        <InviteAcceptForm
          invitation={invitation}
          isLoggedIn={true}
          emailMatch={true}
        />
      );
    }

    return (
      <EmailMismatchShell userEmail={userEmail} inviteEmail={inviteEmail} />
    );
  }

  return (
    <InviteAcceptForm
      invitation={invitation}
      isLoggedIn={false}
      emailMatch={false}
    />
  );
}
