import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AnnouncementsController } from '../src/announcements/announcements.controller';
import { AnnouncementsService } from '../src/announcements/announcements.service';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { BillingController } from '../src/billing/billing.controller';
import { BillingService } from '../src/billing/billing.service';
import { ContactsController } from '../src/contacts/contacts.controller';
import { ContactsService } from '../src/contacts/contacts.service';
import { ResourcesController } from '../src/resources/resources.controller';
import { ResourcesService } from '../src/resources/resources.service';
import { SettingsController } from '../src/settings/settings.controller';
import { SettingsService } from '../src/settings/settings.service';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

describe('Critical member flows (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AuthController,
        UsersController,
        ResourcesController,
        BillingController,
        AnnouncementsController,
        ContactsController,
        SettingsController,
      ],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({ accessToken: 'token' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            uploadAvatar: jest
              .fn()
              .mockResolvedValue({ avatarPath: '/uploads/avatar.png' }),
          },
        },
        {
          provide: ResourcesService,
          useValue: {
            getLibraryFeed: jest.fn().mockResolvedValue({
              resources: { items: [] },
              articles: [],
            }),
            getSavedResources: jest.fn().mockResolvedValue({
              items: [],
              page: 1,
              limit: 0,
              total: 0,
            }),
          },
        },
        {
          provide: BillingService,
          useValue: {
            createCheckoutSession: jest
              .fn()
              .mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
            getInvoiceDetail: jest
              .fn()
              .mockResolvedValue({ transactionId: 'INV-1' }),
          },
        },
        {
          provide: AnnouncementsService,
          useValue: {
            listAnnouncements: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ContactsService,
          useValue: {
            createSubmission: jest.fn().mockResolvedValue({ status: 'NEW' }),
          },
        },
        {
          provide: SettingsService,
          useValue: {
            updateNotificationPreferences: jest
              .fn()
              .mockResolvedValue({ announcementsEnabled: true }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(
      (
        req: Request & { user?: unknown },
        _res: Response,
        next: NextFunction,
      ) => {
        req.user = { id: 'user-1', role: 'ADMIN' };
        next();
      },
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('supports auth login flow', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'member@aria.community', password: 'Password123!' })
      .expect(201)
      .expect(({ body }) => {
        const responseBody = body as { accessToken: string };
        expect(responseBody.accessToken).toBe('token');
      });
  });

  it('supports profile avatar upload flow', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users/me/avatar')
      .attach('file', Buffer.from('avatar'), 'avatar.png')
      .expect(201)
      .expect(({ body }) => {
        const responseBody = body as { avatarPath: string };
        expect(responseBody.avatarPath).toBe('/uploads/avatar.png');
      });
  });

  it('supports combined library flow', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/resources/library')
      .expect(200)
      .expect(({ body }) => {
        const responseBody = body as {
          resources: unknown;
          articles: unknown;
        };
        expect(responseBody.resources).toBeDefined();
        expect(responseBody.articles).toBeDefined();
      });
  });

  it('supports get all saved resources flow', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/resources/saved')
      .expect(200)
      .expect(({ body }) => {
        const responseBody = body as {
          items: unknown;
          total: number;
        };
        expect(responseBody.items).toBeDefined();
        expect(responseBody.total).toBeDefined();
      });
  });

  it('supports Stripe checkout session flow', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/billing/checkout-session')
      .send({ planId: '5e7f3c96-8fb8-4cf6-bb20-5f5c63a4f111' })
      .expect(201)
      .expect(({ body }) => {
        const responseBody = body as { url: string };
        expect(responseBody.url).toContain('stripe.com');
      });
  });

  it('supports invoice detail flow', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/billing/invoices/INV-1')
      .expect(200)
      .expect(({ body }) => {
        const responseBody = body as { transactionId: string };
        expect(responseBody.transactionId).toBe('INV-1');
      });
  });

  it('supports announcements listing flow', async () => {
    await request(app.getHttpServer()).get('/api/v1/announcements').expect(200);
  });

  it('supports contact form submission flow', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/contacts')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Help',
        message: 'I need support.',
      })
      .expect(201);
  });

  it('supports notification settings update flow', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/settings/notifications')
      .send({
        announcementsEnabled: true,
        productUpdatesEnabled: true,
        marketingEnabled: false,
        newsletterEnabled: true,
      })
      .expect(200);
  });
});
