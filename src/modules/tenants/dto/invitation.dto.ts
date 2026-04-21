import { IsNotEmpty, IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OnboardTenantDto {
  @ApiProperty({ example: 'My Dealership' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  @IsNotEmpty()
  ownerEmail: string;
}

export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  confirmPassword: string;
}

export class ValidateOwnerInvitationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;
}
