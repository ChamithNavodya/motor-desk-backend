import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'My Dealership' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  @IsNotEmpty()
  ownerEmail: string;
}

export class CreateInvitationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: 'manager@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
