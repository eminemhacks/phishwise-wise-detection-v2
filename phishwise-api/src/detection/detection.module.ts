import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetectionService } from './detection.service';
import { DetectionController } from './detection.controller';
import { SafeBrowsingService } from './safe-browsing.service';
import { ReportedBlocklistService } from './reported-blocklist.service';
import { Scan } from './scan.entity';
import { ReportedPhishingUrl, ReportedPhishingMessage } from './reported-phishing.entity';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Scan, ReportedPhishingUrl, ReportedPhishingMessage]),
    // ProgressModule exports ProgressService, which owns the server-authoritative
    // gamification recompute. We reuse it (applyScan) rather than forking it.
    ProgressModule,
  ],
  controllers: [DetectionController],
  providers: [DetectionService, SafeBrowsingService, ReportedBlocklistService],
  exports: [DetectionService, ReportedBlocklistService],
})
export class DetectionModule {}
