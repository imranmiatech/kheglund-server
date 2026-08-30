import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<number>('SMTP_PORT') || 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  async sendPasswordResetEmail(toEmail: string, resetToken: string, userName?: string) {
    const from = this.configService.get<string>('SMTP_FROM') || '"My App" <noreply@example.com>';
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0d1415; color: #ffffff; border-radius: 8px;">
        <h2 style="color: #9B71EF; font-family: serif;">Password Reset Request</h2>
        <p style="color: #d7dddd; line-height: 1.6;">Hello ${userName || 'User'},</p>
        <p style="color: #a8b6b8; line-height: 1.6;">You recently requested to reset your password. Use the token or click the button below to reset your password:</p>
        
        <div style="margin: 25px 0; padding: 15px; background-color: #1a2527; border: 1px solid #344346; border-radius: 6px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #8f9d9f;">YOUR RESET TOKEN:</p>
          <code style="font-size: 18px; font-weight: bold; color: #7B43EA; letter-spacing: 1px;">${resetToken}</code>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #7B43EA; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Reset Password</a>
        </div>

        <p style="color: #7f8d91; font-size: 12px; line-height: 1.5; border-top: 1px solid #222d2f; padding-top: 15px;">If you did not request a password reset, please ignore this email. This token is valid for 30 minutes.</p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.warn(`SMTP not configured. Password Reset Token for ${toEmail}: ${resetToken}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Password Reset Request',
        html: htmlContent,
      });
      this.logger.log(`Password reset email successfully sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${toEmail}`, error);
    }
  }
}
