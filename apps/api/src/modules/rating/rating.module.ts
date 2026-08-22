import { Module } from "@nestjs/common";
import { MatchingModule } from "../matching/matching.module";
import { RatingController } from "./rating.controller";
import { RatingService } from "./rating.service";

/** Owns Rating and ProviderProfile.ratingAverage aggregation (Ch58). Depends
 * on Matching (to find who to rate) only through its exported service. */
@Module({
  imports: [MatchingModule],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
