import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createEmailProvider, type ProviderType } from "./email-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invitationId, email, inviteLink } = await req.json();

    // Validate required parameters
    if (!invitationId || typeof invitationId !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid invitationId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!inviteLink || typeof inviteLink !== "string" || !inviteLink.startsWith("http")) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid inviteLink" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get invitation details from database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("workspace_invitations")
      .select(`
        *,
        workspace:workspaces(name),
        inviter:users!workspace_invitations_invited_by_fkey(first_name, last_name)
      `)
      .eq("id", invitationId)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ success: false, error: "Invitation not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Null safety for nested properties
    const workspaceName = invitation.workspace?.name || "Workspace";
    const inviterName = invitation.inviter
      ? `${invitation.inviter.first_name || ""} ${invitation.inviter.last_name || ""}`.trim()
      : "A team member";

    // HTML escape all dynamic content
    const safeInviterName = escapeHtml(inviterName || "A team member");
    const safeWorkspaceName = escapeHtml(workspaceName);
    const safeRole = escapeHtml(invitation.role);

    // Provider type validation
    const providerEnv = Deno.env.get("EMAIL_PROVIDER");
    const validProviders = ["resend", "sendgrid", "smtp"];
    const providerType: ProviderType = validProviders.includes(providerEnv || "")
      ? (providerEnv as ProviderType)
      : "resend";

    const provider = createEmailProvider(providerType);

    const result = await provider.send({
      to: email,
      subject: `You're invited to join ${safeWorkspaceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Workspace Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">You're invited!</h1>
            <p style="color: #666; font-size: 16px;">
              <strong>${safeInviterName}</strong> has invited you to join <strong>${safeWorkspaceName}</strong> on Goal Assist.
            </p>
            <p style="color: #666; font-size: 16px;">
              You'll be joining as a <strong>${safeRole}</strong>.
            </p>
            <a href="${inviteLink}"
               style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
              Accept Invitation
            </a>
            <p style="color: #999; font-size: 14px; margin-top: 24px;">
              This invitation expires in 7 days. If you didn't expect this email, you can ignore it.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `${safeInviterName} has invited you to join ${safeWorkspaceName} on Goal Assist. Accept the invitation: ${inviteLink}`,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
