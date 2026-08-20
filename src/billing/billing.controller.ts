import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
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
  getMyBilling(@CurrentUser() user: { id: string }) {
    return this.billingService.getMyBilling(user.id);
  }

  @Post('checkout-session')
  @ApiOperation({
    summary: 'Create a Stripe Checkout session for a membership plan',
  })
  createCheckoutSession(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.billingService.createCheckoutSession(user.id, dto);
  }

  @Post('portal-session')
  @ApiOperation({ summary: 'Create a Stripe billing portal session' })
  createPortalSession(@CurrentUser() user: { id: string }) {
    return this.billingService.createBillingPortalSession(user.id);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel the current member subscription' })
  cancelSubscription(
    @CurrentUser() user: { id: string },
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.billingService.cancelSubscription(user.id, dto);
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume the current member subscription renewal' })
  resumeSubscription(@CurrentUser() user: { id: string }) {
    return this.billingService.resumeSubscription(user.id);
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
