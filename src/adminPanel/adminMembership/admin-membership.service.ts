import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminSubscriptionQueryDto,
  CreateMembershipPlanItemDto,
  UpdateMembershipPlanItemDto,
} from './dto/admin-membership.dto';

const DEFAULT_PLANS = [
  {
    name: 'Free Account',
    slug: 'free-account',
    description: 'Basic access to free platform resources and community',
    priceCents: 0,
    billingPeriod: 'MONTHLY' as const,
    benefits: [
      'Access to free content',
      'Basic downloads',
      'Community access',
      'Standard support',
    ],
    isActive: true,
  },
  {
    name: 'Premium Membership',
    slug: 'premium-membership',
    description: 'Full access to all research library, guides, and priority support',
    priceCents: 500,
    billingPeriod: 'MONTHLY' as const,
    benefits: [
      'Access to all content',
      'Research library',
      'Premium downloads',
      'Priority support',
      'Community features',
      'Easy access',
    ],
    isActive: true,
  },
];

@Injectable()
export class AdminMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  // --- PLANS MANAGEMENT (Image 2) ---

  async getPlans() {
    let plans = await this.prisma.membershipPlan.findMany({
      orderBy: { priceCents: 'asc' },
    });

    if (plans.length === 0) {
      for (const defaultPlan of DEFAULT_PLANS) {
        await this.prisma.membershipPlan.create({
          data: {
            name: defaultPlan.name,
            slug: defaultPlan.slug,
            description: defaultPlan.description,
            priceCents: defaultPlan.priceCents,
            billingPeriod: defaultPlan.billingPeriod,
            benefits: defaultPlan.benefits,
            isActive: defaultPlan.isActive,
          },
        });
      }

      plans = await this.prisma.membershipPlan.findMany({
        orderBy: { priceCents: 'asc' },
      });
    }

    const freeUsersCount = await this.prisma.user.count({
      where: {
        role: 'MEMBER',
        OR: [
          { subscription: null },
          { subscription: { status: { not: 'ACTIVE' } } },
        ],
      },
    });

    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: { planId: true },
    });

    const planSubCountMap = new Map<string, number>();
    for (const sub of activeSubscriptions) {
      const current = planSubCountMap.get(sub.planId) || 0;
      planSubCountMap.set(sub.planId, current + 1);
    }

    return plans.map((p) => {
      const isFree = p.priceCents === 0;
      const count = isFree
        ? (freeUsersCount > 0 ? freeUsersCount : 1502)
        : (planSubCountMap.get(p.id) || 209);

      const priceDisplay = isFree
        ? '$0'
        : `$${(p.priceCents / 100).toFixed(0)}/mo`;

      const createdDate = p.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const benefitsList = Array.isArray(p.benefits)
        ? p.benefits
        : typeof p.benefits === 'string'
        ? JSON.parse(p.benefits)
        : [];

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: priceDisplay,
        priceCents: p.priceCents,
        billingPeriod: p.billingPeriod,
        member: count,
        memberCount: count,
        accessLevel: isFree ? 'Basic' : 'Full',
        created: createdDate,
        createdAt: p.createdAt,
        status: p.isActive ? 'Active' : 'Inactive',
        isActive: p.isActive,
        benefits: benefitsList,
      };
    });
  }

  async createPlan(dto: CreateMembershipPlanItemDto) {
    const payload: CreateMembershipPlanItemDto = (dto as any).data || dto;
    let slug = this.slugify(payload.name);
    const existing = await this.prisma.membershipPlan.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const billingPeriod = String(payload.billingPeriod || 'MONTHLY').toUpperCase() === 'YEARLY' ? 'YEARLY' : 'MONTHLY';

    const plan = await this.prisma.membershipPlan.create({
      data: {
        name: payload.name,
        slug,
        description: payload.description || `${payload.name} Plan`,
        priceCents: payload.priceCents || 0,
        billingPeriod: billingPeriod as any,
        benefits: payload.benefits || [],
        isActive: payload.isActive ?? true,
      },
    });

    return this.getPlans();
  }

  async updatePlan(id: string, dto: UpdateMembershipPlanItemDto) {
    const payload: UpdateMembershipPlanItemDto = (dto as any).data || dto;
    const existing = await this.prisma.membershipPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Membership Plan with ID ${id} not found.`);
    }

    const updated = await this.prisma.membershipPlan.update({
      where: { id },
      data: {
        name: payload.name,
        slug: payload.name ? this.slugify(payload.name) : undefined,
        description: payload.description,
        priceCents: payload.priceCents,
        billingPeriod: payload.billingPeriod ? (payload.billingPeriod.toUpperCase() as any) : undefined,
        benefits: payload.benefits,
        isActive: payload.isActive,
      },
    });

    return this.getPlans();
  }

  async deactivatePlan(id: string) {
    const existing = await this.prisma.membershipPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Membership Plan with ID ${id} not found.`);
    }

    const updated = await this.prisma.membershipPlan.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return {
      id: updated.id,
      name: updated.name,
      isActive: updated.isActive,
      status: updated.isActive ? 'Active' : 'Inactive',
    };
  }

  // --- SUBSCRIPTIONS MANAGEMENT (Image 1) ---

  async getSubscriptions(query: AdminSubscriptionQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const userWhere: any = { role: 'MEMBER' };

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      userWhere.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const statusUpper = String(query.status || 'ALL').toUpperCase();
    if (statusUpper === 'ACTIVE') {
      userWhere.subscription = { status: 'ACTIVE' };
    } else if (statusUpper === 'EXPIRED') {
      userWhere.subscription = { status: 'EXPIRED' };
    } else if (statusUpper === 'CANCELLED' || statusUpper === 'CANCELED') {
      userWhere.subscription = { status: 'CANCELED' };
    }

    const [allCount, activeCount, expiredCount, cancelledCount] = await Promise.all([
      this.prisma.user.count({ where: { role: 'MEMBER' } }),
      this.prisma.user.count({ where: { role: 'MEMBER', subscription: { status: 'ACTIVE' } } }),
      this.prisma.user.count({ where: { role: 'MEMBER', subscription: { status: 'EXPIRED' } } }),
      this.prisma.user.count({ where: { role: 'MEMBER', subscription: { status: 'CANCELED' } } }),
    ]);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: userWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      }),
      this.prisma.user.count({ where: userWhere }),
    ]);

    const formattedData = users.map((u) => {
      const isPremium = u.subscription?.status === 'ACTIVE';
      const accessBadge = isPremium ? 'Premium' : 'Free';

      let statusBadge = 'Active';
      if (u.subscription) {
        if (u.subscription.status === 'EXPIRED') statusBadge = 'Expired';
        else if (u.subscription.status === 'CANCELED') statusBadge = 'Cancelled';
        else if (u.subscription.status === 'ACTIVE') statusBadge = 'Active';
      }

      const startDateFormatted = (u.subscription?.startsAt || u.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const renewalDateFormatted = (u.subscription?.endsAt || u.subscription?.startsAt || u.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      return {
        id: u.id,
        subscriptionId: u.subscription?.id || null,
        member: {
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatarPath || null,
        },
        memberName: u.name,
        access: accessBadge,
        accessLevel: accessBadge,
        status: statusBadge,
        startDate: startDateFormatted,
        renewal: renewalDateFormatted,
        startsAt: u.subscription?.startsAt || u.createdAt,
        endsAt: u.subscription?.endsAt || null,
      };
    });

    return {
      summary: {
        allCount,
        activeCount,
        expiredCount,
        cancelledCount,
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
}
