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

    return {
      subscription,
      features: subscription?.plan?.benefits ?? [],
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
