import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

/**
 * Scaffolded module boundary only in this bootstrap phase. Full dispatch
 * logic (candidate retrieval via ProviderService, ranking with a distance-sort
 * fallback, timeout-driven reassignment through RequestService.transition(),
 * broadcast-vs-single-offer per ServiceArea config) is Ch53's job — see
 * docs/architecture.md §9 and the Reconciliation Notes for what's deferred.
 */
@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async listAssignmentsForRequest(serviceRequestId: string) {
    return this.prisma.assignment.findMany({
      where: { serviceRequestId },
      orderBy: { offeredAt: "asc" },
    });
  }
}
