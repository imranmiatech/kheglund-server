import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMembershipPlanDto } from './dto/memberships.dto';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  getPlans() {
    return this.prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: [{ priceCents: 'asc' }],
    });
  }

  async getMySubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    const userCreatedAt = user?.createdAt ?? new Date();

    if (!subscription) {
      return {
        subscription: {
          id: null,
          userId,
          status: 'INACTIVE',
          startsAt: userCreatedAt,
          endsAt: null,
          autoRenew: false,
          createdAt: userCreatedAt,
          plan: null,
        },
        features: [
          'Basic Resource Library Access',
          'Free Announcements & Blogs',
          'Standard Support',
        ],
      };
    }

    const planBenefits = Array.isArray(subscription.plan?.benefits)
      ? (subscription.plan?.benefits as string[])
      : [];

    const defaultFeatures = [
      'Full Resource Library Access',
      'Unlimited Downloads',
      'Knowledge Library',
      'Members-Only Announcements',
      'Priority Support',
      'Exclusive Content',
    ];

    const startsAt = subscription.startsAt || subscription.createdAt || userCreatedAt;
    const endsAt = subscription.endsAt;

    return {
      subscription: {
        ...subscription,
        startsAt,
        endsAt,
        currentPeriodStart: startsAt,
        currentPeriodEnd: endsAt,
      },
      features: planBenefits.length > 0 ? planBenefits : defaultFeatures,
    };
  }

  createPlan(dto: CreateMembershipPlanDto) {
    return this.prisma.membershipPlan.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        priceCents: dto.priceCents,
        billingPeriod: dto.billingPeriod as never,
        benefits: dto.benefits,
        isActive: dto.isActive,
      },
    });
  }

  listPlansForAdmin() {
    return this.prisma.membershipPlan.findMany({
      orderBy: [{ priceCents: 'asc' }],
    });
  }
}
