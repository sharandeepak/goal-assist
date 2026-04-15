export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}

export type ProviderType = "resend" | "sendgrid" | "smtp";

export function createEmailProvider(type: ProviderType): EmailProvider {
  switch (type) {
    case "resend":
      return new ResendProvider();
    default:
      throw new Error(`Unknown email provider: ${type}`);
  }
}

class ResendProvider implements EmailProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get("RESEND_API_KEY") || "";
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("EMAIL_FROM") || "Goal Assist <noreply@goalassist.app>",
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
