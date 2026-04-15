import { redirect } from "next/navigation";
import { createClient } from "@/common/lib/supabase/server";
import { getPendingInvitesForEmail } from "@/features/invite/services/inviteService";
import { PendingInvitesList } from "./pending-invites-list";

export default async function PendingInvitesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/auth/signin");
  }

  const pendingInvites = await getPendingInvitesForEmail(user.email);

  if (pendingInvites.length === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">You have pending invitations</h1>
          <p className="text-muted-foreground mt-2">
            Accept or decline the invitations below, or create a new workspace.
          </p>
        </div>

        <PendingInvitesList invites={pendingInvites} userAuthId={user.id} />
      </div>
    </div>
  );
}
