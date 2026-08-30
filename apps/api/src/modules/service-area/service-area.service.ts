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

  /**
   * CLAUDE.md rule 8 / ADR 0006: `serviceAreaId` must never be trusted as
   * client input — a session claiming any city's UUID would otherwise be
   * able to pull that city's matching/pricing data. This is the real
   * data-access-layer enforcement point: RequestService.create() derives the
   * request's city from where it actually is, not from what the client says.
   *
   * Point-in-polygon via PostGIS ST_Contains against each ServiceArea's
   * `boundary` — cast to geometry since ST_Contains doesn't operate on
   * geography directly. Falls back honestly rather than fabricating an
   * answer: if no boundary polygon contains the point (none may even be
   * drawn yet — `boundary` starts NULL, see ServiceAreaService.create()),
   * and exactly one ServiceArea exists system-wide, every request belongs to
   * it by definition (the same single-area bootstrap reality this project's
   * seed data already reflects). With zero or multiple ServiceAreas and no
   * polygon match, there's genuinely no way to know which city this is —
   * refuses to guess rather than silently picking one.
   */
  async resolveForPoint(latitude: number, longitude: number): Promise<string> {
    const matches = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM service_areas
      WHERE boundary IS NOT NULL
        AND ST_Contains(boundary::geometry, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
      LIMIT 1
    `;
    if (matches[0]) {
      return matches[0].id;
    }

    const all = await this.prisma.serviceArea.findMany({ select: { id: true } });
    if (all.length === 1) {
      return all[0].id;
    }
    throw new NotFoundException(
      "No ServiceArea's boundary covers this pickup location, and more than one ServiceArea " +
        "exists — cannot infer which one this request belongs to.",
    );
  }
}
