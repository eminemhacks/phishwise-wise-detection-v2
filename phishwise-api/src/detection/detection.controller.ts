import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DetectionService } from './detection.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { InputType } from './types';

class ScanDto {
  @IsIn(['url', 'message'])
  inputType: InputType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  input: string;
}

@Controller('detection')
export class DetectionController {
  constructor(private readonly detection: DetectionService) {}

  /**
   * Public "Try it" endpoint for the landing page. No login required and the
   * scan is NOT saved. The UI up-sells account creation via Scan History.
   */
  @Public()
  @Post('scan')
  scanPublic(@Body() dto: ScanDto) {
    return this.detection.scanPublic(dto.input, dto.inputType);
  }

  /** Read-only rule catalog (educational; safe to expose publicly). */
  @Public()
  @Get('rules')
  rules() {
    return this.detection.ruleCatalog();
  }

  /** Authenticated scan \u2014 saved to the user's history and rewarded with XP. */
  @Post('scans')
  scan(@CurrentUser() user: JwtUser, @Body() dto: ScanDto) {
    return this.detection.scanForUser(user.sub, dto.input, dto.inputType);
  }

  /** The current user's saved scan history (newest first). */
  @Get('scans')
  history(@CurrentUser() user: JwtUser) {
    return this.detection.history(user.sub);
  }

  /** Current user's detection stats (scan count, threats caught, distribution). */
  @Get('me/stats')
  myStats(@CurrentUser() user: JwtUser) {
    return this.detection.myStats(user.sub);
  }

  /** A single saved scan with its full itemised result. */
  @Get('scans/:id')
  getOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.detection.getScan(user.sub, id);
  }

  @Delete('scans/:id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.detection.deleteScan(user.sub, id);
  }

  /** Platform-wide detection analytics (admin only). */
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/stats')
  adminStats() {
    return this.detection.adminStats();
  }
}
