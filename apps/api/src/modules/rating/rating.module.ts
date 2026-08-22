import { Module } from "@nestjs/common";
import { MatchingModule } from "../matching/matching.module";
import { ProviderModule } from "../provider/provider.module";
import { RatingController } from "./rating.controller";
import { RatingService } from "./rating.service";

/** Owns Rating and ProviderProfile.ratingAverage aggregation (Ch58). Depends
 * on Matching (to find who to rate) and Provider (trust-score recompute)
 * only through their exported services. */
@Module({
  imports: [MatchingModule, ProviderModule],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
