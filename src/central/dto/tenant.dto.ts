import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  ownerEmail: string;
}

export class CreateInvitationDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
