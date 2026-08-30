import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminChangePasswordDto,
  SaveAdminPaymentInfoDto,
  UpdateAdminNotificationSettingsDto,
  UpdateAdminPaymentInfoDto,
  UpdateAdminProfileDto,
} from './dto/admin-settings.dto';

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotificationSettings(userId: string) {
    const prefs = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        userJoinNotification: true,
        adminAlerts: true,
        memberNotifications: false,
        paymentNotifications: false,
      },
    });

    return {
      id: prefs.id,
      userId: prefs.userId,
      userJoinNotification: prefs.userJoinNotification ?? true,
      adminAlerts: prefs.adminAlerts ?? true,
      memberNotifications: prefs.memberNotifications ?? false,
      paymentNotifications: prefs.paymentNotifications ?? false,
      announcementsEnabled: prefs.announcementsEnabled ?? true,
      productUpdatesEnabled: prefs.productUpdatesEnabled ?? true,
      marketingEnabled: prefs.marketingEnabled ?? false,
      newsletterEnabled: prefs.newsletterEnabled ?? true,
      updatedAt: prefs.updatedAt,
    };
  }

  async updateNotificationSettings(
    userId: string,
    dto: UpdateAdminNotificationSettingsDto,
  ) {
    const payload: UpdateAdminNotificationSettingsDto = (dto as any).data || dto;

    const updated = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        userJoinNotification: payload.userJoinNotification,
        adminAlerts: payload.adminAlerts,
        memberNotifications: payload.memberNotifications,
        paymentNotifications: payload.paymentNotifications,
        announcementsEnabled: payload.announcementsEnabled,
        productUpdatesEnabled: payload.productUpdatesEnabled,
        marketingEnabled: payload.marketingEnabled,
        newsletterEnabled: payload.newsletterEnabled,
      },
      create: {
        userId,
        userJoinNotification: payload.userJoinNotification ?? true,
        adminAlerts: payload.adminAlerts ?? true,
        memberNotifications: payload.memberNotifications ?? false,
        paymentNotifications: payload.paymentNotifications ?? false,
        announcementsEnabled: payload.announcementsEnabled ?? true,
        productUpdatesEnabled: payload.productUpdatesEnabled ?? true,
        marketingEnabled: payload.marketingEnabled ?? false,
        newsletterEnabled: payload.newsletterEnabled ?? true,
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      userJoinNotification: updated.userJoinNotification,
      adminAlerts: updated.adminAlerts,
      memberNotifications: updated.memberNotifications,
      paymentNotifications: updated.paymentNotifications,
      announcementsEnabled: updated.announcementsEnabled,
      productUpdatesEnabled: updated.productUpdatesEnabled,
      marketingEnabled: updated.marketingEnabled,
      newsletterEnabled: updated.newsletterEnabled,
      updatedAt: updated.updatedAt,
    };
  }

  async getProfileSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
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

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    return user;
  }

  async updateProfileSettings(userId: string, dto: UpdateAdminProfileDto) {
    const payload: UpdateAdminProfileDto = (dto as any).data || dto;

    if (payload.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: payload.email.toLowerCase(),
          NOT: { id: userId },
        },
      });
      if (existing) {
        throw new BadRequestException('Email address is already in use by another account.');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: payload.name,
        email: payload.email ? payload.email.toLowerCase() : undefined,
        avatarPath: payload.avatarPath,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarPath: true,
        createdAt: true,
      },
    });

    return updated;
  }

  async changePassword(userId: string, dto: AdminChangePasswordDto) {
    const payload: AdminChangePasswordDto = (dto as any).data || dto;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    if (payload.currentPassword) {
      const isValid = await bcrypt.compare(payload.currentPassword, user.passwordHash);
      if (!isValid) {
        throw new BadRequestException('Current password does not match.');
      }
    }

    if (!payload.newPassword || payload.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters.');
    }

    const newHash = await bcrypt.hash(payload.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return {
      message: 'Password changed successfully.',
    };
  }

  // --- ADMIN BANK & PAYMENT RECEIVING INFO ---

  async getPaymentInfo() {
    let items = await this.prisma.adminPaymentInfo.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    if (items.length === 0) {
      await this.prisma.adminPaymentInfo.create({
        data: {
          methodType: 'BANK_ACCOUNT',
          bankName: 'City Bank',
          accountHolderName: 'Admin Official Receiving Account',
          accountNumber: '123456789012',
          routingNumber: '110000000',
          branchName: 'Main Corporate Branch',
          instructions: 'Please include your member email address in bank transfer reference.',
          isDefault: true,
          isActive: true,
        },
      });

      items = await this.prisma.adminPaymentInfo.findMany({
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    }

    return items;
  }

  async savePaymentInfo(userId: string, dto: SaveAdminPaymentInfoDto) {
    const payload: SaveAdminPaymentInfoDto = (dto as any).data || dto;

    if (payload.isDefault) {
      await this.prisma.adminPaymentInfo.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const cardLast4Val = payload.cardLast4 || (payload.cardNumber ? payload.cardNumber.slice(-4) : null);

    const item = await this.prisma.adminPaymentInfo.create({
      data: {
        label: payload.label || null,
        methodType: payload.methodType || 'BANK_ACCOUNT',
        providerName: payload.providerName || payload.bankName || 'Bank',
        bankName: payload.bankName || payload.providerName || 'Bank',
        accountHolderName: payload.accountHolderName || 'Admin Account',
        cardNumber: payload.cardNumber || null,
        cardLast4: cardLast4Val,
        expiryMonth: payload.expiryMonth || null,
        expiryYear: payload.expiryYear || null,
        accountNumber: payload.accountNumber || '',
        routingNumber: payload.routingNumber || null,
        iban: payload.iban || null,
        branchName: payload.branchName || null,
        stripeConnectedAccountId: payload.stripeConnectedAccountId || null,
        instructions: payload.instructions || null,
        isDefault: payload.isDefault ?? true,
        isActive: payload.isActive ?? true,
        createdById: userId,
      },
    });

    return item;
  }

  async updatePaymentInfo(id: string, dto: UpdateAdminPaymentInfoDto) {
    const payload: UpdateAdminPaymentInfoDto = (dto as any).data || dto;
    const existing = await this.prisma.adminPaymentInfo.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Payment info entry with ID ${id} not found.`);
    }

    if (payload.isDefault) {
      await this.prisma.adminPaymentInfo.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const cardLast4Val = payload.cardLast4 || (payload.cardNumber ? payload.cardNumber.slice(-4) : existing.cardLast4);

    const updated = await this.prisma.adminPaymentInfo.update({
      where: { id },
      data: {
        label: payload.label ?? existing.label,
        methodType: payload.methodType ?? existing.methodType,
        providerName: payload.providerName ?? payload.bankName ?? existing.providerName,
        bankName: payload.bankName ?? payload.providerName ?? existing.bankName,
        accountHolderName: payload.accountHolderName ?? existing.accountHolderName,
        cardNumber: payload.cardNumber ?? existing.cardNumber,
        cardLast4: cardLast4Val,
        expiryMonth: payload.expiryMonth ?? existing.expiryMonth,
        expiryYear: payload.expiryYear ?? existing.expiryYear,
        accountNumber: payload.accountNumber ?? existing.accountNumber,
        routingNumber: payload.routingNumber ?? existing.routingNumber,
        iban: payload.iban ?? existing.iban,
        branchName: payload.branchName ?? existing.branchName,
        stripeConnectedAccountId: payload.stripeConnectedAccountId ?? existing.stripeConnectedAccountId,
        instructions: payload.instructions ?? existing.instructions,
        isDefault: payload.isDefault ?? existing.isDefault,
        isActive: payload.isActive ?? existing.isActive,
      },
    });

    return updated;
  }

  async deletePaymentInfo(id: string) {
    const existing = await this.prisma.adminPaymentInfo.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Payment info entry with ID ${id} not found.`);
    }

    await this.prisma.adminPaymentInfo.delete({ where: { id } });
    return {
      message: 'Payment receiving info deleted successfully.',
      id,
    };
  }
}
