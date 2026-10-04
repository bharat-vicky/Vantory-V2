import nodemailer from "nodemailer";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendAuthEmail(input: {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  expiresIn: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("Authentication email delivery is not configured.");
  }

  const port = Number(process.env.SMTP_PORT) || 465;
  const transporter = nodemailer.createTransport(
    host.includes("gmail.com")
      ? { service: "gmail", auth: { user, pass } }
      : { host, port, secure: port === 465, auth: { user, pass } },
  );
  const title = escapeHtml(input.title);
  const message = escapeHtml(input.message);
  const actionLabel = escapeHtml(input.actionLabel);
  const actionUrl = escapeHtml(input.actionUrl);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to: input.to,
    subject: input.subject,
    text: `${input.title}\n\n${input.message}\n\n${input.actionLabel}: ${input.actionUrl}\n\nThis link expires in ${input.expiresIn}.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;padding:28px;border:1px solid #e4e4e7;border-radius:12px;color:#18181b"><h1 style="font-size:22px">${title}</h1><p style="line-height:1.6">${message}</p><p style="margin:28px 0"><a href="${actionUrl}" style="background:#09090b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">${actionLabel}</a></p><p style="font-size:12px;color:#71717a">This link expires in ${escapeHtml(input.expiresIn)}. If you did not request this, you can ignore this email.</p></div>`,
  });
}
