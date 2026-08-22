import { Injectable, NotFoundException } from "@nestjs/common";
import { ServiceAreaLaunchPhase as PrismaLaunchPhase } from "@prisma/client";
import { ServiceAreaLaunchPhase } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateServiceAreaDto } from "./dto/create-service-area.dto";

/**
 * Ch7's four-phase cold-start playbook, given a data home (ADR 0006).
 * Onboarding a new city is a data operation here, not a code change.
 */
@Injectable()
export class ServiceAreaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceAreaDto) {
    const created = await this.prisma.serviceArea.create({
      data: {
        name: dto.name,
        launchPhase:
          (dto.launchPhase as unknown as PrismaLaunchPhase) ??
          (ServiceAreaLaunchPhase.SUPPLY_SEEDING as unknown as PrismaLaunchPhase),
      },
    });

    if (dto.boundary && dto.boundary.length >= 3) {
      const ring = [...dto.boundary, dto.boundary[0]]
        .map((point) => `${point.longitude} ${point.latitude}`)
        .join(", ");
      await this.prisma.$executeRaw`
        UPDATE service_areas
        SET boundary = ST_SetSRID(ST_GeomFromText(${`POLYGON((${ring}))`}), 4326)::geography
        WHERE id = ${created.id}
      `;
    }

    return created;
  }

  async findAll() {
    return this.prisma.serviceArea.findMany({ orderBy: { createdAt: "asc" } });
  }

  async findById(id: string) {
    const area = await this.prisma.serviceArea.findUnique({ where: { id } });
    if (!area) {
      throw new NotFoundException(`ServiceArea ${id} not found`);
    }
    return area;
  }

  /** Advancing a city's Ch7 launch phase is a plain data update — no code deploy required. */
  async advancePhase(id: string, launchPhase: ServiceAreaLaunchPhase) {
    await this.findById(id);
    return this.prisma.serviceArea.update({
      where: { id },
      data: { launchPhase: launchPhase as unknown as PrismaLaunchPhase },
    });
  }
}
