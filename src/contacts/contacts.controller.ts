import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateContactSubmissionDto } from './dto/contacts.dto';
import { ContactsService } from './contacts.service';

@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit the public contact form' })
  createSubmission(
    @Body() dto: CreateContactSubmissionDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.contactsService.createSubmission(dto, user?.id);
  }

  @Public()
  @Get('channels')
  @ApiOperation({ summary: 'Get contact information channels' })
  getChannels() {
    return this.contactsService.getChannels();
  }

  @Public()
  @Get('faqs')
  @ApiOperation({ summary: 'Get FAQ entries for public pages' })
  getFaqs(@Query('page') page?: string) {
    return this.contactsService.getFaqs(page);
  }

  @Public()
  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get public content page content by slug' })
  getContentPage(@Param('slug') slug: string) {
    return this.contactsService.getContentPage(slug);
  }
}
