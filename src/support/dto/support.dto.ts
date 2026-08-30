import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({ example: 'Unable to export data to CSV format' })
  @IsString()
  subject: string;

  @ApiProperty({ example: 'Detailed description of issue...' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 'HIGH' })
  @IsOptional()
  @IsString()
  priority?: string = 'MEDIUM';
}

export class CreateTicketMessageDto {
  @ApiProperty({ example: 'Here is additional context or reply...' })
  @IsString()
  message: string;
}
