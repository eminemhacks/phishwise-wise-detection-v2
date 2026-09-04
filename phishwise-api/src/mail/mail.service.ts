import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private usePreview = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const host = this.config.get<string>('mail.host');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('mail.port'),
        secure: this.config.get<boolean>('mail.secure'),
        auth: {
          user: this.config.get<string>('mail.user'),
          pass: this.config.get<string>('mail.password'),
        },
      });
      this.logger.log(`SMTP mail transport ready (${host})`);
    } else {
      // No SMTP configured — fall back to a JSON transport that logs
      // emails (and their links) to the server console. Perfect for a demo.
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.usePreview = true;
      this.logger.warn(
        'No MAIL_HOST set — emails will be logged to the console instead of sent.',
      );
    }
  }

  private async send(to: string, subject: string, html: string, text: string) {
    const from = this.config.get<string>('mail.from');
    const info = await this.transporter!.sendMail({ from, to, subject, html, text });
    if (this.usePreview) {
      this.logger.log(
        `\n──────── EMAIL (preview) ────────\nTo: ${to}\nSubject: ${subject}\n\n${text}\n─────────────────────────────────`,
      );
    }
    return info;
  }

  async sendVerificationEmail(to: string, name: string, link: string) {
    const subject = 'Verify your PhishWise account';
    const text = `Hi ${name},\n\nWelcome to PhishWise! Confirm your email to activate your account:\n${link}\n\nThis link expires soon. If you didn't sign up, you can ignore this email.`;
    const html = this.wrap(
      `<h2>Welcome to PhishWise, ${escapeHtml(name)} 👋</h2>
       <p>Confirm your email address to activate your account and start your security training.</p>
       <p style="text-align:center;margin:32px 0">
         <a href="${link}" style="background:#0d9f92;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600">Verify my email</a>
       </p>
       <p style="color:#64748b;font-size:13px">Or paste this link into your browser:<br>${link}</p>`,
    );
    return this.send(to, subject, html, text);
  }

  async sendPasswordResetEmail(to: string, name: string, link: string) {
    const subject = 'Reset your PhishWise password';
    const text = `Hi ${name},\n\nWe received a request to reset your password. Use the link below to choose a new one:\n${link}\n\nIf you didn't request this, you can safely ignore this email — your password won't change.`;
    const html = this.wrap(
      `<h2>Reset your password</h2>
       <p>We received a request to reset the password for your PhishWise account.</p>
       <p style="text-align:center;margin:32px 0">
         <a href="${link}" style="background:#0d9f92;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600">Choose a new password</a>
       </p>
       <p style="color:#64748b;font-size:13px">This link expires shortly. If you didn't request a reset, ignore this email.</p>`,
    );
    return this.send(to, subject, html, text);
  }

  private wrap(inner: string) {
    return `<div style="font-family:Inter,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
      <div style="font-weight:700;font-size:20px;color:#0d9f92;margin-bottom:16px">🛡 PhishWise</div>
      ${inner}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
      <p style="color:#94a3b8;font-size:12px">PhishWise — gamified phishing awareness training.</p>
    </div>`;
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c];
  });
}
