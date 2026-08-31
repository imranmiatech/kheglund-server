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

  async sendWelcomeEmail(toEmail: string, userName?: string) {
    const from = this.configService.get<string>('SMTP_FROM') || '"Kheglund Platform" <noreply@example.com>';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0d1415; color: #ffffff; border-radius: 12px; border: 1px solid #202a2c;">
        <h2 style="color: #9B71EF; font-family: serif; font-size: 24px; margin-top: 0;">Welcome to Kheglund Platform!</h2>
        <p style="color: #d7dddd; line-height: 1.6;">Hello ${userName || 'Valued Member'},</p>
        <p style="color: #a8b6b8; line-height: 1.6;">Thank you for registering your account. We are excited to have you join our community hub.</p>
        <div style="margin: 24px 0; padding: 16px; background-color: #151d1f; border-left: 4px solid #7B43EA; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #d7dddd;">You can now access member resources, masterclasses, announcements, and support from your member dashboard.</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="http://localhost:5173/login" style="background-color: #7B43EA; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Go to Member Portal</a>
        </div>
        <p style="color: #7f8d91; font-size: 12px; border-top: 1px solid #202a2c; padding-top: 16px; margin-bottom: 0;">If you have any questions, feel free to submit a support request or contact us.</p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.warn(`SMTP not configured. Welcome email content to ${toEmail}:\n${htmlContent}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Welcome to Kheglund Platform!',
        html: htmlContent,
      });
      this.logger.log(`Welcome email sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${toEmail}`, error);
    }
  }

  async sendSupportConfirmationEmail(toEmail: string, name?: string, ticketNumber?: string, subject?: string) {
    const from = this.configService.get<string>('SMTP_FROM') || '"Support Team" <noreply@example.com>';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0d1415; color: #ffffff; border-radius: 8px;">
        <h2 style="color: #9B71EF; font-family: serif;">Thank You for Reaching Out!</h2>
        <p style="color: #d7dddd; line-height: 1.6;">Hello ${name || 'Valued Customer'},</p>
        <p style="color: #a8b6b8; line-height: 1.6;">Thank you for submitting your support request. We have received your message and our team will get back to you as soon as possible.</p>
        
        <div style="margin: 25px 0; padding: 15px; background-color: #1a2527; border: 1px solid #344346; border-radius: 6px;">
          ${ticketNumber ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #8f9d9f;"><strong>Ticket Number:</strong> <span style="color: #7B43EA; font-weight: bold;">${ticketNumber}</span></p>` : ''}
          ${subject ? `<p style="margin: 0; font-size: 14px; color: #8f9d9f;"><strong>Subject:</strong> ${subject}</p>` : ''}
        </div>

        <p style="color: #7f8d91; font-size: 12px; line-height: 1.5; border-top: 1px solid #222d2f; padding-top: 15px;">This is an automated confirmation message. If you have additional information to add, please contact our support team.</p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.warn(`SMTP not configured. Support confirmation email for ${toEmail} (Ticket: ${ticketNumber || 'N/A'})`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: toEmail,
        subject: `Support Request Received ${ticketNumber ? `[${ticketNumber}]` : ''}`,
        html: htmlContent,
      });
      this.logger.log(`Support confirmation email successfully sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send support confirmation email to ${toEmail}`, error);
    }
  }

  async sendSupportStatusUpdateEmail(
    toEmail: string,
    name?: string,
    ticketNumber?: string,
    status?: string,
    subject?: string,
  ) {
    const from = this.configService.get<string>('SMTP_FROM') || '"Support Team" <noreply@example.com>';
    const formattedStatus = status || 'Updated';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0d1415; color: #ffffff; border-radius: 8px;">
        <h2 style="color: #9B71EF; font-family: serif;">Support Ticket Status Update</h2>
        <p style="color: #d7dddd; line-height: 1.6;">Hello ${name || 'Valued Customer'},</p>
        <p style="color: #a8b6b8; line-height: 1.6;">The status of your support ticket has been updated to: <strong style="color: #9B71EF; font-size: 16px;">${formattedStatus}</strong>.</p>
        
        <div style="margin: 25px 0; padding: 15px; background-color: #1a2527; border: 1px solid #344346; border-radius: 6px;">
          ${ticketNumber ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #8f9d9f;"><strong>Ticket Number:</strong> <span style="color: #7B43EA; font-weight: bold;">${ticketNumber}</span></p>` : ''}
          ${subject ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #8f9d9f;"><strong>Subject:</strong> ${subject}</p>` : ''}
          <p style="margin: 0; font-size: 14px; color: #8f9d9f;"><strong>Status:</strong> <span style="color: #10B981; font-weight: bold;">${formattedStatus}</span></p>
        </div>

        <p style="color: #7f8d91; font-size: 12px; line-height: 1.5; border-top: 1px solid #222d2f; padding-top: 15px;">Thank you for your patience. If you have further questions, feel free to contact us.</p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.warn(`SMTP not configured. Support status update email for ${toEmail} [Ticket: ${ticketNumber || 'N/A'}, Status: ${formattedStatus}]`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: toEmail,
        subject: `Support Ticket Updated ${ticketNumber ? `[${ticketNumber}]` : ''}: ${formattedStatus}`,
        html: htmlContent,
      });
      this.logger.log(`Support status update email successfully sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send support status update email to ${toEmail}`, error);
    }
  }

  async sendSupportReplyEmail(
    toEmail: string,
    name?: string,
    ticketNumber?: string,
    replyMessage?: string,
    subject?: string,
  ) {
    const from = this.configService.get<string>('SMTP_FROM') || '"Support Team" <noreply@example.com>';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0d1415; color: #ffffff; border-radius: 8px;">
        <h2 style="color: #9B71EF; font-family: serif;">New Support Reply Message</h2>
        <p style="color: #d7dddd; line-height: 1.6;">Hello ${name || 'Valued Customer'},</p>
        <p style="color: #a8b6b8; line-height: 1.6;">Our support team has posted a response to your ticket:</p>
        
        <div style="margin: 20px 0; padding: 16px; background-color: #1a2527; border-left: 4px solid #7B43EA; border-radius: 4px; color: #ffffff; font-size: 14px; line-height: 1.6;">
          ${replyMessage || ''}
        </div>

        <div style="margin: 25px 0; padding: 15px; background-color: #151d1e; border: 1px solid #283538; border-radius: 6px;">
          ${ticketNumber ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #8f9d9f;"><strong>Ticket Number:</strong> ${ticketNumber}</p>` : ''}
          ${subject ? `<p style="margin: 0; font-size: 13px; color: #8f9d9f;"><strong>Subject:</strong> ${subject}</p>` : ''}
        </div>

        <p style="color: #7f8d91; font-size: 12px; line-height: 1.5; border-top: 1px solid #222d2f; padding-top: 15px;">Thank you for contacting our support team.</p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.warn(`SMTP not configured. Ticket reply email for ${toEmail} [Ticket: ${ticketNumber || 'N/A'}]`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: toEmail,
        subject: `New Reply on Support Ticket ${ticketNumber ? `[${ticketNumber}]` : ''}: ${subject || ''}`,
        html: htmlContent,
      });
      this.logger.log(`Support reply email successfully sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send support reply email to ${toEmail}`, error);
    }
  }
}
