import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? '',
  }),
});

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const freePlan = await prisma.membershipPlan.upsert({
    where: { slug: 'free' },
    update: {
      name: 'Free',
      description: 'Starter community access',
      priceCents: 0,
      billingPeriod: 'MONTHLY',
      benefits: ['Community access', 'Public updates', 'Basic profile'],
      isActive: true,
    },
    create: {
      name: 'Free',
      slug: 'free',
      description: 'Starter community access',
      priceCents: 0,
      billingPeriod: 'MONTHLY',
      benefits: ['Community access', 'Public updates', 'Basic profile'],
      isActive: true,
    },
  });

  const premiumPlan = await prisma.membershipPlan.upsert({
    where: { slug: 'premium' },
    update: {
      name: 'Premium',
      description: 'Full access to the resource library and member content',
      priceCents: 5200,
      billingPeriod: 'MONTHLY',
      benefits: [
        'Full Resource Library Access',
        'Unlimited Downloads',
        'Knowledge Library',
        'Members-Only Announcements',
        'Priority Support',
        'Exclusive Content',
      ],
      isActive: true,
    },
    create: {
      name: 'Premium',
      slug: 'premium',
      description: 'Full access to the resource library and member content',
      priceCents: 5200,
      billingPeriod: 'MONTHLY',
      benefits: [
        'Full Resource Library Access',
        'Unlimited Downloads',
        'Knowledge Library',
        'Members-Only Announcements',
        'Priority Support',
        'Exclusive Content',
      ],
      isActive: true,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@aria.community' },
    update: {
      name: 'ARIA Admin',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name: 'ARIA Admin',
      email: 'admin@aria.community',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const customAdminPasswordHash = await bcrypt.hash('12341234', 10);
  await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      name: 'Admin',
      passwordHash: customAdminPasswordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name: 'Admin',
      email: 'admin@gmail.com',
      passwordHash: customAdminPasswordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'member@aria.community' },
    update: {
      name: 'ARIA Member',
      passwordHash,
      role: 'MEMBER',
      isActive: true,
    },
    create: {
      name: 'ARIA Member',
      email: 'member@aria.community',
      passwordHash,
      role: 'MEMBER',
      isActive: true,
    },
  });

  await prisma.subscription.upsert({
    where: { userId: memberUser.id },
    update: {
      planId: premiumPlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
    },
    create: {
      userId: memberUser.id,
      planId: premiumPlan.id,
      status: 'ACTIVE',
      startsAt: new Date(),
    },
  });



  await prisma.contactChannel.upsert({
    where: { id: 'seed-email-channel' },
    update: {
      type: 'EMAIL',
      label: 'Email Us',
      value: 'hello@aria.community',
      helperText: 'We respond within 24 hours',
      sortOrder: 0,
      isPublished: true,
    },
    create: {
      id: 'seed-email-channel',
      type: 'EMAIL',
      label: 'Email Us',
      value: 'hello@aria.community',
      helperText: 'We respond within 24 hours',
      sortOrder: 0,
      isPublished: true,
    },
  });

  await prisma.faqItem.createMany({
    data: [
      {
        page: 'MEMBERSHIP',
        question: 'What does premium membership include?',
        answer: 'Premium members get the full resource library and exclusive updates.',
        sortOrder: 0,
      },
      {
        page: 'CONTACT',
        question: 'How long does support take to respond?',
        answer: 'Most contact requests are answered within one business day.',
        sortOrder: 0,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.billingTransaction.createMany({
    data: [
      {
        userId: memberUser.id,
        subscriptionId: (await prisma.subscription.findUniqueOrThrow({
          where: { userId: memberUser.id },
        })).id,
        planId: premiumPlan.id,
        transactionId: 'INV-00299',
        amountCents: 5200,
        billingPeriod: 'MONTHLY',
        status: 'PAID',
        paidAt: new Date(),
      },
      {
        userId: memberUser.id,
        subscriptionId: (await prisma.subscription.findUniqueOrThrow({
          where: { userId: memberUser.id },
        })).id,
        planId: premiumPlan.id,
        transactionId: 'INV-00297',
        amountCents: 5300,
        billingPeriod: 'MONTHLY',
        status: 'PAID',
        paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.notificationPreference.upsert({
    where: { userId: memberUser.id },
    update: {},
    create: {
      userId: memberUser.id,
      announcementsEnabled: true,
      productUpdatesEnabled: true,
      marketingEnabled: false,
      newsletterEnabled: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
