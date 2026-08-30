import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Outgoing email, behind an interface with two implementations.
 *
 * Without SMTP configured the console driver logs the message — including the
 * reset link — instead of sending it. That is what makes the password reset
 * flow testable on a laptop with no mail server, and it means deploying only
 * requires setting SMTP_HOST and friends: no code changes, and nothing that
 * silently does nothing in production.
 */
export interface Mailer {
  send(mail: Mail): Promise<void>;
}

class ConsoleMailer implements Mailer {
  async send(mail: Mail): Promise<void> {
    console.info(
      [
        '',
        '─'.repeat(72),
        '  EMAIL NOT SENT — no SMTP_HOST configured, printing instead',
        '─'.repeat(72),
        `  To:      ${mail.to}`,
        `  Subject: ${mail.subject}`,
        '',
        mail.text
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n'),
        '─'.repeat(72),
        '',
      ].join('\n'),
    );
  }
}

class SmtpMailer implements Mailer {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }

  async send(mail: Mail): Promise<void> {
    await this.transporter.sendMail({
      from: env.MAIL_FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  }
}

export const mailer: Mailer = env.mailEnabled ? new SmtpMailer() : new ConsoleMailer();

/**
 * The password reset email.
 *
 * Plain text is sent alongside the HTML because some mail clients — and most
 * corporate filters — show it in preference, and a reset link nobody can click
 * is a support call.
 */
export function passwordResetEmail(input: { name: string; resetUrl: string; ttlMinutes: number }): Mail {
  const { name, resetUrl, ttlMinutes } = input;
  const expiry = ttlMinutes >= 60 ? `${Math.round(ttlMinutes / 60)} hour(s)` : `${ttlMinutes} minutes`;

  const text = [
    `Hello ${name},`,
    '',
    'Someone asked to reset the password on your ADEF TVET School dashboard account.',
    '',
    'Open this link to choose a new password:',
    resetUrl,
    '',
    `The link stops working in ${expiry}, and can only be used once.`,
    '',
    'If this was not you, you can ignore this email — nothing has changed.',
    '',
    'ADEF TVET School',
  ].join('\n');

  const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px">Hello ${escapeHtml(name)},</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
    Someone asked to reset the password on your ADEF TVET School dashboard account.
  </p>
  <p style="margin:0 0 24px">
    <a href="${escapeHtml(resetUrl)}"
       style="display:inline-block;background:#F07826;color:#ffffff;text-decoration:none;
              padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px">
      Choose a new password
    </a>
  </p>
  <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 16px">
    The link stops working in ${escapeHtml(expiry)}, and can only be used once.
  </p>
  <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 16px">
    If this was not you, you can ignore this email — nothing has changed.
  </p>
  <p style="font-size:13px;line-height:1.6;color:#9ca3af;margin:24px 0 0;
            border-top:1px solid #e5e7eb;padding-top:16px">
    If the button does not work, copy this address into your browser:<br />
    <span style="word-break:break-all">${escapeHtml(resetUrl)}</span>
  </p>
</div>`.trim();

  return {
    to: '',
    subject: 'Reset your ADEF dashboard password',
    text,
    html,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
