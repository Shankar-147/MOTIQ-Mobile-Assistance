import { Module } from "@nestjs/common";
import { RatingService } from "./rating.service";

/** Owns Rating and (future) ProviderProfile.ratingAverage aggregation (Ch58). */
@Module({
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
