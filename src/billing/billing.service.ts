import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import {
  CancelSubscriptionDto,
  CreateCheckoutSessionDto,
} from './dto/billing.dto';

@Injectable()
export class BillingService {
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = secretKey
      ? new Stripe(secretKey, {
          apiVersion: '2026-07-29.dahlia',
        })
      : null;
  }

  async getMyBilling(userId: string) {
    const [transactions, subscription] = await Promise.all([
      this.prisma.billingTransaction.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      }),
    ]);

    const totalSpentCents = transactions
      .filter((transaction) => transaction.status === 'PAID')
      .reduce((sum, transaction) => sum + transaction.amountCents, 0);

    return {
      currentPlan: subscription?.plan ?? null,
      subscriptionStatus: subscription?.status ?? null,
      transactions,
      totalSpentCents,
    };
  }

  async createCheckoutSession(userId: string, dto: CreateCheckoutSessionDto) {
    const stripe = this.getStripeClient();
    const [user, plan] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.membershipPlan.findUnique({ where: { id: dto.planId } }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Membership plan not found.');
    }

    if (plan.priceCents <= 0) {
      throw new BadRequestException(
        'Free plans do not require Stripe checkout.',
      );
    }

    const customerId = await this.getOrCreateStripeCustomer(user.id);
    const recurring:
      | Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring
      | undefined =
      plan.billingPeriod === 'ONE_TIME'
        ? undefined
        : {
            interval: plan.billingPeriod === 'YEARLY' ? 'year' : 'month',
          };
    const mode = plan.billingPeriod === 'ONE_TIME' ? 'payment' : 'subscription';

    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      success_url: this.configService.getOrThrow<string>('STRIPE_SUCCESS_URL'),
      cancel_url: this.configService.getOrThrow<string>('STRIPE_CANCEL_URL'),
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        planId: plan.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: plan.priceCents,
            recurring,
            product_data: {
              name: plan.name,
              description: plan.description,
            },
          },
        },
      ],
    });

    return {
      checkoutSessionId: session.id,
      url: session.url,
    };
  }

  async createBillingPortalSession(userId: string) {
    const stripe = this.getStripeClient();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new BadRequestException(
        'No Stripe customer exists for this member yet.',
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: this.configService.getOrThrow<string>(
        'STRIPE_BILLING_PORTAL_RETURN_URL',
      ),
    });

    return {
      url: portalSession.url,
    };
  }

  async cancelSubscription(userId: string, dto: CancelSubscriptionDto) {
    const stripe = this.getStripeClient();
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found.');
    }

    if (subscription.externalSubscriptionId) {
      await stripe.subscriptions.update(subscription.externalSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        autoRenew: false,
        status: 'CANCELED',
      },
    });

    await this.prisma.dashboardActivity.create({
      data: {
        userId,
        type: 'PLAN_CHANGED',
        title: 'Subscription cancellation requested',
        description: dto.reason ?? 'Member requested cancellation.',
      },
    });

    return {
      message: 'Subscription cancellation scheduled successfully.',
    };
  }

  async resumeSubscription(userId: string) {
    const stripe = this.getStripeClient();
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found.');
    }

    if (subscription.externalSubscriptionId) {
      await stripe.subscriptions.update(subscription.externalSubscriptionId, {
        cancel_at_period_end: false,
      });
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        autoRenew: true,
        status: 'ACTIVE',
      },
    });

    await this.prisma.dashboardActivity.create({
      data: {
        userId,
        type: 'PLAN_CHANGED',
        title: 'Subscription resumed',
        description: 'Member resumed automatic renewal.',
      },
    });

    return {
      message: 'Subscription resumed successfully.',
    };
  }

  async getInvoiceDetail(userId: string, transactionId: string) {
    const transaction = await this.prisma.billingTransaction.findFirst({
      where: {
        userId,
        transactionId,
      },
      include: {
        plan: true,
        subscription: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Billing transaction not found.');
    }

    return transaction;
  }

  async handleStripeWebhook(signature: string | undefined, rawBody: Buffer) {
    const stripe = this.getStripeClient();
    const webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';

    if (!signature || !webhookSecret) {
      throw new BadRequestException('Stripe webhook signature is invalid.');
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaid(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.syncStripeSubscription(event.data.object);
        break;
      default:
        break;
    }

    return { received: true };
  }

  private getStripeClient(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY first.',
      );
    }

    return this.stripe;
  }

  private async getOrCreateStripeCustomer(userId: string) {
    const stripe = this.getStripeClient();
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        stripeCustomerId: customer.id,
      },
    });

    return customer.id;
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (!userId || !planId) {
      return;
    }

    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId:
          typeof session.customer === 'string' ? session.customer : null,
      },
    });

    if (
      session.mode === 'subscription' &&
      typeof session.subscription === 'string'
    ) {
      await this.prisma.subscription.upsert({
        where: { userId },
        update: {
          planId,
          status: 'ACTIVE',
          autoRenew: true,
          externalSubscriptionId: session.subscription,
          startsAt: new Date(),
          endsAt: null,
        },
        create: {
          userId,
          planId,
          status: 'ACTIVE',
          autoRenew: true,
          externalSubscriptionId: session.subscription,
          startsAt: new Date(),
        },
      });
    }

    await this.prisma.billingTransaction.upsert({
      where: { transactionId: session.id },
      update: {
        externalReference:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : null,
        amountCents: session.amount_total ?? plan.priceCents,
        billingPeriod: plan.billingPeriod,
        status: session.payment_status === 'paid' ? 'PAID' : 'PENDING',
        paidAt: session.payment_status === 'paid' ? new Date() : null,
      },
      create: {
        userId,
        subscriptionId:
          session.mode === 'subscription'
            ? (
                await this.prisma.subscription.findUnique({
                  where: { userId },
                })
              )?.id
            : null,
        planId,
        transactionId: session.id,
        externalReference:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : null,
        amountCents: session.amount_total ?? plan.priceCents,
        billingPeriod: plan.billingPeriod,
        status: session.payment_status === 'paid' ? 'PAID' : 'PENDING',
        paidAt: session.payment_status === 'paid' ? new Date() : null,
      },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const invoicePayload = invoice as Stripe.Invoice & {
      subscription?: unknown;
      payment_intent?: unknown;
    };
    const externalSubscriptionId = this.extractExpandableId(
      invoicePayload.subscription,
    );
    const externalPaymentReference = this.extractExpandableId(
      invoicePayload.payment_intent,
    );

    if (!externalSubscriptionId) {
      return;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { externalSubscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      return;
    }

    await this.prisma.billingTransaction.upsert({
      where: {
        transactionId: invoice.id,
      },
      update: {
        externalReference: externalPaymentReference,
        amountCents: invoice.amount_paid,
        billingPeriod: subscription.plan.billingPeriod,
        status: 'PAID',
        paidAt: new Date(),
      },
      create: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        planId: subscription.planId,
        transactionId: invoice.id,
        externalReference: externalPaymentReference,
        amountCents: invoice.amount_paid,
        billingPeriod: subscription.plan.billingPeriod,
        status: 'PAID',
        paidAt: new Date(),
      },
    });
  }

  private async syncStripeSubscription(subscription: Stripe.Subscription) {
    const externalSubscriptionId = subscription.id;
    const localSubscription = await this.prisma.subscription.findFirst({
      where: { externalSubscriptionId },
    });

    if (!localSubscription) {
      return;
    }

    const stripeStatusMap: Record<
      string,
      'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED'
    > = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      unpaid: 'PAST_DUE',
      incomplete_expired: 'EXPIRED',
      incomplete: 'PAST_DUE',
      trialing: 'ACTIVE',
      paused: 'PAST_DUE',
    };

    await this.prisma.subscription.update({
      where: { id: localSubscription.id },
      data: {
        status: stripeStatusMap[subscription.status] ?? 'ACTIVE',
        autoRenew: !subscription.cancel_at_period_end,
        endsAt: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : null,
      },
    });
  }

  private extractExpandableId(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof value.id === 'string'
    ) {
      return value.id;
    }

    return null;
  }
}
