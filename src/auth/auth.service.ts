import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';

type AuthUser = {
  id: string;
  email: string;
  role: string;
  name: string;
};

import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
      },
    });

    // 1. Notify admin of new member signup in DB
    await this.prisma.notification.create({
      data: {
        userId: null,
        title: 'New Member Signed Up',
        message: `User ${user.name || user.email} just created an account.`,
        type: 'USER_JOIN',
        link: '/admin/member',
        isRead: false,
      },
    }).catch(() => {});

    // 2. Dispatch welcome email to user
    this.mailService.sendWelcomeEmail(user.email, user.name).catch(() => {});

    return this.issueAuthTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isValidPassword = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.issueAuthTokens(user);
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = this.jwtService.verify<{
      sub: string;
      sessionId: string;
    }>(dto.refreshToken, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const matches = await bcrypt.compare(
      dto.refreshToken,
      session.refreshTokenHash,
    );

    if (!matches) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    return this.issueAuthTokens(session.user, session.id);
  }

  async logout(userId: string, dto?: LogoutDto) {
    if (!dto?.refreshToken) {
      await this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return { message: 'Logged out successfully.' };
    }

    try {
      const payload = this.jwtService.verify<{ sub: string; sessionId: string }>(
        dto.refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );

      if (payload.sub !== userId) {
        throw new UnauthorizedException('Refresh token is invalid.');
      }

      const { count } = await this.prisma.session.updateMany({
        where: { id: payload.sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (!count) {
        throw new UnauthorizedException('Refresh token is invalid.');
      }
    } catch {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    return { message: 'Logged out successfully.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      return {
        message:
          'If an account exists for this email, a reset link has been prepared.',
      };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    // Send email using SMTP Nodemailer
    await this.mailService.sendPasswordResetEmail(user.email, rawToken, user.name);

    return {
      message: 'Password reset email sent successfully.',
      resetToken: rawToken,
      debugToken:
        this.configService.get('NODE_ENV') === 'production'
          ? undefined
          : rawToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Reset token is invalid or expired.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password updated successfully.' };
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarPath: true,
        createdAt: true,
      },
    });
  }

  private async issueAuthTokens(
    user: AuthUser,
    existingSessionId?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    user: Pick<AuthUser, 'id' | 'name' | 'email' | 'role'>;
  }> {
    const sessionId = existingSessionId ?? randomUUID();
    const accessPayload = {
      sub: user.id,
      sessionId,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload);
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        sessionId,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_TTL',
          '7d',
        ) as never,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const refreshExpiry = this.parseDurationToDate(
      this.configService.get<string>('JWT_REFRESH_TTL', '7d'),
    );

    await this.prisma.session.upsert({
      where: { id: sessionId },
      update: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: refreshExpiry,
      },
      create: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        expiresAt: refreshExpiry,
      },
    });

    return {
      accessToken,
      refreshToken,
      sessionId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  private parseDurationToDate(duration: string): Date {
    const match = duration.match(/^(\d+)([mhd])$/);

    if (!match) {
      return new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multiplier =
      unit === 'm'
        ? 1000 * 60
        : unit === 'h'
          ? 1000 * 60 * 60
          : 1000 * 60 * 60 * 24;

    return new Date(Date.now() + value * multiplier);
  }
}
