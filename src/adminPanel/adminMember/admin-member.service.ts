import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminMemberQueryDto,
  CreateMemberDto,
  MemberFilterStatus,
  MemberSortOption,
  UpdateMemberDto,
  UpdateMemberStatusDto,
} from './dto/admin-member.dto';

@Injectable()
export class AdminMemberService {
  constructor(private readonly prisma: PrismaService) {}

  private formatTimeAgo(date?: Date | null): string {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
    if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
    const diffMonth = Math.floor(diffDay / 30);
    return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
  }

  async getMembers(query: AdminMemberQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Base conditions: exclude soft-deleted users and optional role filter if needed
    const baseWhere: any = {
      deletedAt: null,
    };

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      baseWhere.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    // Counts for tabs summary
    const [allCount, freeCount, premiumCount, suspendedCount] =
      await Promise.all([
        this.prisma.user.count({
          where: { ...baseWhere, role: 'MEMBER' },
        }),
        this.prisma.user.count({
          where: {
            ...baseWhere,
            role: 'MEMBER',
            isActive: true,
            OR: [
              { subscription: null },
              { subscription: { status: { not: 'ACTIVE' } } },
            ],
          },
        }),
        this.prisma.user.count({
          where: {
            ...baseWhere,
            role: 'MEMBER',
            isActive: true,
            subscription: { status: 'ACTIVE' },
          },
        }),
        this.prisma.user.count({
          where: {
            ...baseWhere,
            role: 'MEMBER',
            isActive: false,
          },
        }),
      ]);

    // Apply Filter Tab condition to actual page query
    const whereCondition: any = { ...baseWhere, role: 'MEMBER' };
    const filterUpper = String(query.filter || 'ALL').toUpperCase();
    if (filterUpper === 'FREE') {
      whereCondition.isActive = true;
      whereCondition.OR = [
        { subscription: null },
        { subscription: { status: { not: 'ACTIVE' } } },
      ];
    } else if (filterUpper === 'PREMIUM') {
      whereCondition.isActive = true;
      whereCondition.subscription = { status: 'ACTIVE' };
    } else if (filterUpper === 'SUSPENDED') {
      whereCondition.isActive = false;
    }

    // Sorting order matching UI options:
    // 1. Newest First (NEWEST)
    // 2. Oldest First (OLDEST)
    // 3. Recently activity (RECENT_ACTIVITY)
    // 4. Alphabetical (ALPHABETICAL)
    const sortNorm = String(query.sort || 'NEWEST').toUpperCase().replace(/\s+/g, '_');
    let orderBy: any = { createdAt: 'desc' };

    if (sortNorm === 'OLDEST' || sortNorm === 'OLDEST_FIRST') {
      orderBy = { createdAt: 'asc' };
    } else if (sortNorm === 'ALPHABETICAL') {
      orderBy = { name: 'asc' };
    } else if (
      sortNorm === 'RECENT_ACTIVITY' ||
      sortNorm === 'RECENTLY_ACTIVITY' ||
      sortNorm === 'RECENT_ACTIVITIES'
    ) {
      orderBy = { updatedAt: 'desc' };
    } else {
      orderBy = { createdAt: 'desc' }; // Default: NEWEST / NEWEST_FIRST
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy,
        include: {
          subscription: {
            include: { plan: true },
          },
          billingTransactions: {
            where: { status: 'PAID' },
            select: { amountCents: true },
          },
          dashboardActivities: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          },
        },
      }),
      this.prisma.user.count({ where: whereCondition }),
    ]);

    const formattedData = users.map((u) => {
      const isPremium = u.subscription?.status === 'ACTIVE';
      const membership = isPremium ? 'Premium' : 'Free';
      const totalSpendCents = u.billingTransactions.reduce(
        (sum, tx) => sum + tx.amountCents,
        0,
      );
      const totalSpend = Math.round(totalSpendCents / 100);

      const lastActivityDate =
        u.dashboardActivities[0]?.createdAt || u.updatedAt || u.createdAt;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatarPath: u.avatarPath,
        membership,
        joinedDate: u.createdAt,
        totalSpend,
        lastActive: this.formatTimeAgo(lastActivityDate),
        lastActiveAt: lastActivityDate,
        status: u.isActive ? 'ACTIVE' : 'SUSPENDED',
        isActive: u.isActive,
      };
    });

    return {
      summary: {
        allCount,
        freeCount,
        premiumCount,
        suspendedCount,
      },
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMemberById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        subscription: {
          include: { plan: true },
        },
        resourceDownloads: {
          take: 5,
          orderBy: { downloadedAt: 'desc' },
          include: {
            resource: {
              select: { title: true, kind: true, category: { select: { name: true } } },
            },
          },
        },
        dashboardActivities: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`Member with ID ${id} not found.`);
    }

    const [downloadsCount, activityCount] = await Promise.all([
      this.prisma.resourceDownload.count({ where: { userId: id } }),
      this.prisma.dashboardActivity.count({ where: { userId: id } }),
    ]);

    const registeredAt = user.createdAt;
    const now = new Date();
    const daysActive = Math.max(
      1,
      Math.floor((now.getTime() - registeredAt.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const isPremium = user.subscription?.status === 'ACTIVE';

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: null,
      role: user.role,
      avatarPath: user.avatarPath,
      isActive: user.isActive,
      status: user.isActive ? 'ACTIVE' : 'SUSPENDED',
      membershipTier: isPremium ? 'Premium member' : 'Free member',
      registeredAt: user.createdAt,
      lastLoginAt: user.updatedAt,
      lastLogin: this.formatTimeAgo(user.updatedAt),
      stats: {
        totalDownloads: downloadsCount,
        commentsCount: activityCount,
        daysActive,
      },
      membership: {
        currentPlan: isPremium
          ? user.subscription?.plan?.name || 'Premium Membership'
          : 'Free Membership',
        status: user.subscription?.status || 'Active',
        startDate: user.subscription?.startsAt || user.createdAt,
        renewalDate: user.subscription?.endsAt || null,
        paymentStatus: isPremium ? 'Paid' : 'N/A',
      },
      recentDownloads: user.resourceDownloads.map((d) => ({
        id: d.id,
        title: d.resource.title,
        category: d.resource.category?.name || d.resource.kind || 'Resource',
        downloadedAt: d.downloadedAt,
      })),
      recentComments: user.dashboardActivities.map((act) => ({
        id: act.id,
        comment: act.description || act.title,
        targetTitle: act.title,
        createdAt: act.createdAt,
      })),
    };
  }

  async createMember(dto: CreateMemberDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists.');
    }

    const rawPassword = dto.password || 'Member123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: 'MEMBER',
        avatarPath: dto.avatarPath || null,
      },
    });

    const isPremium = dto.membership?.toLowerCase() === 'premium';
    if (isPremium) {
      // Find or create default premium plan
      let plan = await this.prisma.membershipPlan.findFirst({
        where: { name: { contains: 'Premium', mode: 'insensitive' } },
      });

      if (!plan) {
        plan = await this.prisma.membershipPlan.create({
          data: {
            name: 'Premium Membership',
            slug: 'premium-membership',
            description: 'Standard Premium Membership Plan',
            priceCents: 4900,
            billingPeriod: 'MONTHLY',
            benefits: ['Unlimited downloads', 'Exclusive articles'],
          },
        });
      }

      await this.prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: 'ACTIVE',
          startsAt: new Date(),
        },
      });

      // Record transaction if paidBy is provided and not Free
      const paidByRaw = (dto.paidBy || '').trim();
      let paidByFormatted = 'Free';
      if (/cash/i.test(paidByRaw)) {
        paidByFormatted = 'Cash';
      } else if (/bank/i.test(paidByRaw)) {
        paidByFormatted = 'Bank Transfer';
      } else if (/e-?\s*banking/i.test(paidByRaw)) {
        paidByFormatted = 'E-banking';
      } else if (paidByRaw && !/free/i.test(paidByRaw)) {
        paidByFormatted = paidByRaw;
      }

      if (paidByFormatted !== 'Free') {
        await this.prisma.billingTransaction.create({
          data: {
            userId: user.id,
            planId: plan.id,
            transactionId: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            amountCents: plan.priceCents,
            billingPeriod: 'MONTHLY',
            status: 'PAID',
            paidAt: new Date(),
          },
        });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        membership: isPremium ? 'Premium' : 'Free',
        paidBy: isPremium ? paidByFormatted : 'Free',
        status: 'ACTIVE',
        createdAt: user.createdAt,
      };
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      membership: 'Free',
      paidBy: 'Free',
      status: 'ACTIVE',
      createdAt: user.createdAt,
    };
  }

  async updateMember(id: string, dto: UpdateMemberDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException(`Member with ID ${id} not found.`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email ? dto.email.toLowerCase() : undefined,
        avatarPath: dto.avatarPath,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });

    if (dto.membership) {
      const isPremium = dto.membership.toLowerCase() === 'premium';
      if (isPremium) {
        let plan = await this.prisma.membershipPlan.findFirst({
          where: { name: { contains: 'Premium', mode: 'insensitive' } },
        });

        if (!plan) {
          plan = await this.prisma.membershipPlan.create({
            data: {
              name: 'Premium Membership',
              slug: 'premium-membership',
              description: 'Standard Premium Membership Plan',
              priceCents: 4900,
              billingPeriod: 'MONTHLY',
              benefits: ['Unlimited downloads'],
            },
          });
        }

        await this.prisma.subscription.upsert({
          where: { userId: id },
          create: {
            userId: id,
            planId: plan.id,
            status: 'ACTIVE',
            startsAt: new Date(),
          },
          update: {
            planId: plan.id,
            status: 'ACTIVE',
          },
        });
      } else {
        await this.prisma.subscription.updateMany({
          where: { userId: id },
          data: { status: 'INACTIVE' },
        });
      }
    }

    return updatedUser;
  }

  async updateMemberStatus(id: string, dto: UpdateMemberStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException(`Member with ID ${id} not found.`);
    }

    let isActive = user.isActive;
    if (dto.status) {
      isActive = dto.status === 'ACTIVE';
    } else if (dto.isActive !== undefined) {
      isActive = dto.isActive;
    } else {
      // Toggle if nothing specified
      isActive = !user.isActive;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      status: updated.isActive ? 'ACTIVE' : 'SUSPENDED',
    };
  }

  async deleteMember(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException(`Member with ID ${id} not found.`);
    }

    await this.prisma.user.delete({ where: { id } });
    return {
      message: `Member ${user.name} permanently deleted.`,
      id,
    };
  }
}
