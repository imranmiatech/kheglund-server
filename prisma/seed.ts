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

  const [freePlan, premiumPlan] = await Promise.all([
    prisma.membershipPlan.upsert({
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
    }),
    prisma.membershipPlan.upsert({
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
    }),
  ]);

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

  const [resourceCategory, pdfTag, articleTag] = await Promise.all([
    prisma.resourceCategory.upsert({
      where: { slug: 'guides' },
      update: {
        name: 'Guides',
        description: 'Member guides and downloadable templates',
      },
      create: {
        name: 'Guides',
        slug: 'guides',
        description: 'Member guides and downloadable templates',
      },
    }),
    prisma.resourceTag.upsert({
      where: { slug: 'pdf' },
      update: { name: 'PDF' },
      create: { name: 'PDF', slug: 'pdf' },
    }),
    prisma.articleTag.upsert({
      where: { slug: 'community' },
      update: { name: 'Community' },
      create: { name: 'Community', slug: 'community' },
    }),
  ]);

  const sampleUpload = await prisma.fileUpload.create({
    data: {
      originalName: 'community-guide.pdf',
      storageName: 'community-guide.pdf',
      storagePath: '/uploads/community-guide.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 102400,
      purpose: 'RESOURCE',
      uploadedById: adminUser.id,
    },
  });

  const resource = await prisma.resource.upsert({
    where: { slug: 'member-guide' },
    update: {
      title: 'Member Guide',
      description: 'A downloadable onboarding guide for premium members.',
      summary: 'Everything new members need to get started.',
      kind: 'PDF',
      visibility: 'MEMBERS_ONLY',
      isPublished: true,
      categoryId: resourceCategory.id,
      createdById: adminUser.id,
      publishedAt: new Date(),
    },
    create: {
      title: 'Member Guide',
      slug: 'member-guide',
      description: 'A downloadable onboarding guide for premium members.',
      summary: 'Everything new members need to get started.',
      kind: 'PDF',
      visibility: 'MEMBERS_ONLY',
      isPublished: true,
      categoryId: resourceCategory.id,
      createdById: adminUser.id,
      publishedAt: new Date(),
    },
  });

  await prisma.resourceTagOnResource.upsert({
    where: {
      resourceId_tagId: {
        resourceId: resource.id,
        tagId: pdfTag.id,
      },
    },
    update: {},
    create: {
      resourceId: resource.id,
      tagId: pdfTag.id,
    },
  });

  await prisma.resourceFile.upsert({
    where: { fileUploadId: sampleUpload.id },
    update: {
      resourceId: resource.id,
    },
    create: {
      resourceId: resource.id,
      fileUploadId: sampleUpload.id,
    },
  });

  const article = await prisma.article.upsert({
    where: { slug: 'welcome-to-aria' },
    update: {
      title: 'Welcome to ARIA',
      summary: 'A quick overview of the community and member experience.',
      content:
        'ARIA helps creators discover resources, read updates, and manage memberships from one place.',
      visibility: 'PUBLIC',
      isPublished: true,
      createdById: adminUser.id,
      publishedAt: new Date(),
    },
    create: {
      title: 'Welcome to ARIA',
      slug: 'welcome-to-aria',
      summary: 'A quick overview of the community and member experience.',
      content:
        'ARIA helps creators discover resources, read updates, and manage memberships from one place.',
      visibility: 'PUBLIC',
      isPublished: true,
      createdById: adminUser.id,
      publishedAt: new Date(),
    },
  });

  await prisma.articleTagOnArticle.upsert({
    where: {
      articleId_tagId: {
        articleId: article.id,
        tagId: articleTag.id,
      },
    },
    update: {},
    create: {
      articleId: article.id,
      tagId: articleTag.id,
    },
  });

  await prisma.announcement.upsert({
    where: { slug: 'member-portal-live' },
    update: {
      title: 'Member Portal Live',
      summary: 'The new dashboard, library, and billing experience are available.',
      content:
        'Members can now browse resources, read articles, and manage billing from the new portal.',
      type: 'PRODUCT',
      visibility: 'MEMBERS_ONLY',
      isPublished: true,
      createdById: adminUser.id,
      publishedAt: new Date(),
    },
    create: {
      title: 'Member Portal Live',
      slug: 'member-portal-live',
      summary: 'The new dashboard, library, and billing experience are available.',
      content:
        'Members can now browse resources, read articles, and manage billing from the new portal.',
      type: 'PRODUCT',
      visibility: 'MEMBERS_ONLY',
      isPublished: true,
      createdById: adminUser.id,
      publishedAt: new Date(),
    },
  });

  await Promise.all([
    prisma.contentPage.upsert({
      where: { slug: 'privacy-policy' },
      update: {
        title: 'Privacy Policy',
        content: 'We protect member data and process account information securely.',
        visibility: 'PUBLIC',
        isPublished: true,
      },
      create: {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        content: 'We protect member data and process account information securely.',
        visibility: 'PUBLIC',
        isPublished: true,
      },
    }),
    prisma.contentPage.upsert({
      where: { slug: 'about-us' },
      update: {
        title: 'About Us',
        content: 'ARIA is a creator-focused membership community.',
        visibility: 'PUBLIC',
        isPublished: true,
      },
      create: {
        slug: 'about-us',
        title: 'About Us',
        content: 'ARIA is a creator-focused membership community.',
        visibility: 'PUBLIC',
        isPublished: true,
      },
    }),
    prisma.contactChannel.upsert({
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
    }),
  ]);

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
