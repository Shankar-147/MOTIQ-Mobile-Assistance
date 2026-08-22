import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class RatingService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(params: {
    serviceRequestId: string;
    customerProfileId: string;
    providerProfileId: string;
    stars: number;
    comment?: string;
  }) {
    const rating = await this.prisma.rating.create({ data: params });

    // Recompute the provider's denormalized read-model (Ch58). A full
    // implementation would do this incrementally; this bootstrap phase
    // recomputes directly since correctness matters more than efficiency
    // at zero scale, and it's a single, obviously-correct aggregate query.
    const agg = await this.prisma.rating.aggregate({
      where: { providerProfileId: params.providerProfileId },
      _avg: { stars: true },
      _count: true,
    });
    await this.prisma.providerProfile.update({
      where: { id: params.providerProfileId },
      data: {
        ratingAverage: agg._avg.stars ?? 0,
        completedJobCount: agg._count,
      },
    });

    return rating;
  }
}
