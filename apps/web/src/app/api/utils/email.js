import logger from "./logger";
import { isDemoMode } from "./demoMode";

export async function sendTransactionalEmail({ to, subject, html, text }) {
  if (isDemoMode()) {
    logger.info(
      { to: Array.isArray(to) ? to : [to], subject, demo: true },
      "Demo mode skipped transactional email",
    );
    return true;
  }

  const from = process.env.EMAIL_FROM;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!from || !resendApiKey) {
    console.warn("Email provider not configured. Skipping email send.");
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Failed to send email: ${response.status} ${details}`);
  }

  return true;
}
