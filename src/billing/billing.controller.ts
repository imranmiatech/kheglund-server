import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { BillingService } from './billing.service';
import {
  CancelSubscriptionDto,
  CreateCheckoutSessionDto,
} from './dto/billing.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user billing summary and history' })
  getMyBilling(@CurrentUser() user: any) {
    const userId = user?.id || user?.sub || user?.userId;
    return this.billingService.getMyBilling(userId);
  }

  @Get('verify-session')
  @ApiOperation({ summary: 'Verify and activate a Stripe checkout session' })
  verifySession(
    @CurrentUser() user: any,
    @Query('session_id') sessionId?: string,
  ) {
    const userId = user?.id || user?.sub || user?.userId;
    return this.billingService.verifySession(userId, sessionId);
  }

  @Post('checkout-session')
  @ApiOperation({
    summary: 'Create a Stripe Checkout session for a membership plan',
  })
  createCheckoutSession(
    @CurrentUser() user: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const userId = user?.id || user?.sub || user?.userId;
    return this.billingService.createCheckoutSession(userId, dto);
  }

  @Post('portal-session')
  @ApiOperation({ summary: 'Create a Stripe billing portal session' })
  createPortalSession(@CurrentUser() user: any) {
    const userId = user?.id || user?.sub || user?.userId;
    return this.billingService.createBillingPortalSession(userId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel the current member subscription' })
  cancelSubscription(
    @CurrentUser() user: any,
    @Body() dto: CancelSubscriptionDto,
  ) {
    const userId = user?.id || user?.sub || user?.userId;
    return this.billingService.cancelSubscription(userId, dto);
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume the current member subscription renewal' })
  resumeSubscription(@CurrentUser() user: any) {
    const userId = user?.id || user?.sub || user?.userId;
    return this.billingService.resumeSubscription(userId);
  }

  @Get('invoices/:transactionId')
  @ApiOperation({
    summary: 'Get a single billing invoice or transaction detail',
  })
  getInvoiceDetail(
    @CurrentUser() user: { id: string },
    @Param('transactionId') transactionId: string,
  ) {
    return this.billingService.getInvoiceDetail(user.id, transactionId);
  }

  @Public()
  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  handleStripeWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    return this.billingService.handleStripeWebhook(
      signature,
      req.rawBody ?? Buffer.from(''),
    );
  }
}
