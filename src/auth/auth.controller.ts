import { Controller, Post, Body, HttpCode, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TenantService } from '../central/services/tenant.service';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private tenantService: TenantService,
    private authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ResponseMessage('Login successful')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('register')
  @HttpCode(200)
  @ResponseMessage('Registration successful')
  async register(@Body() dto: RegisterDto) {
    const result = await this.tenantService.acceptInvitation(dto.token, dto.password);
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('User profile fetched')
  getProfile() {
    return { message: 'Profile endpoint' };
  }
}
