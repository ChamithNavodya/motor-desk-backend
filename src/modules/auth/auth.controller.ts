import { Controller, Post, Body, HttpCode, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { ResponseMessage } from '../../decorators/response-message.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { LoginDto } from './dto/auth.dto.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('central/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Superadmin login (Central)' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT.' })
  @ResponseMessage('Login successful')
  async loginCentral(@Body() dto: LoginDto) {
    return this.authService.loginCentral(dto.email, dto.password);
  }

  @Post('owner/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Tenant user login (Owners/Staff)' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT.' })
  @ResponseMessage('Login successful')
  async loginOwner(@Body() dto: LoginDto) {
    return this.authService.loginOwner(dto.email, dto.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ResponseMessage('User profile fetched')
  getProfile() {
    return { message: 'Profile endpoint' };
  }
}
