import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RequestStatus as PrismaRequestStatus } from "@prisma/client";
import { RequestStatus } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  DomainEvents,
  RequestCompletedEvent,
  RequestCreatedEvent,
} from "../../common/events/domain-events";
import { ServiceAreaService } from "../service-area/service-area.service";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { assertValidTransition } from "./request-state-machine";

@Injectable()
export class RequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly serviceAreaService: ServiceAreaService,
  ) {}

  async create(customerProfileId: string, dto: CreateServiceRequestDto) {
    const vehicleSnapshot = await this.resolveVehicleSnapshot(dto.vehicleId);
    // CLAUDE.md rule 8 / ADR 0006 — never trust a client-supplied
    // serviceAreaId; derive it from where the request actually is. See
    // ServiceAreaService.resolveForPoint()'s doc comment.
    const serviceAreaId = await this.serviceAreaService.resolveForPoint(
      dto.pickupLocation.latitude,
      dto.pickupLocation.longitude,
    );

    const created = await this.prisma.serviceRequest.create({
      data: {
        customerProfileId,
        serviceAreaId,
        issueType: dto.issueType,
        vehicleId: dto.vehicleId,
        description: dto.description,
        ...vehicleSnapshot,
      },
    });

    // pickupLocation is a PostGIS geography column — Unsupported in Prisma's
    // client types (ADR 0002), so it's set via raw SQL, the one documented
    // escape hatch from "no raw SQL in domain code" (CLAUDE.md).
    await this.prisma.$executeRaw`
      UPDATE service_requests
      SET "pickupLocation" = ST_SetSRID(
        ST_MakePoint(${dto.pickupLocation.longitude}, ${dto.pickupLocation.latitude}),
        4326
      )::geography
      WHERE id = ${created.id}
    `;

    // Matching (Ch53) reacts to this — see MatchingService's @OnEvent listener.
    // Request never imports Matching (ADR 0001); this is the decoupling point.
    this.events.emit(DomainEvents.RequestCreated, {
      serviceRequestId: created.id,
    } satisfies RequestCreatedEvent);

    return created;
  }

  /** Ch71 — the mobile Customer app's request history screen. Cursor-based,
   * per docs/api-conventions.md's pagination convention (same pattern as
   * ProviderService.listAll/listOwnJobs). */
  async listByCustomer(customerProfileId: string, params: { cursor?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 25, 100);
    const requests = await this.prisma.serviceRequest.findMany({
      where: { customerProfileId },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = requests.length > limit;
    const page = hasMore ? requests.slice(0, limit) : requests;
    return {
      data: page,
      pagination: { nextCursor: hasMore ? page[page.length - 1].id : null, limit },
    };
  }

  /** Ch61/Ch137's admin manual-dispatch queue — requests automated matching
   * either hasn't resolved yet (MATCHING) or gave up on (EXPIRED). Cursor-
   * paginated, per docs/api-conventions.md. */
  async listNeedingDispatch(params: { cursor?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 25, 100);
    const requests = await this.prisma.serviceRequest.findMany({
      where: { status: { in: [PrismaRequestStatus.MATCHING, PrismaRequestStatus.EXPIRED] } },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = requests.length > limit;
    const page = hasMore ? requests.slice(0, limit) : requests;
    return {
      data: page,
      pagination: { nextCursor: hasMore ? page[page.length - 1].id : null, limit },
    };
  }

  async findById(id: string) {
    const request = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException(`ServiceRequest ${id} not found`);
    }
    return { ...request, pickupLocation: await this.getPickupLocation(id) };
  }

  /** pickupLocation is a PostGIS Unsupported column (ADR 0002) — invisible to
   * the generated Prisma Client entirely, so it has to be read back via the
   * same raw-SQL escape hatch used to write it (see create() above). Ch71's
   * mobile live-tracking map needs the actual coordinates, not just "it's
   * set somewhere" — this is the first read path for this column. */
  private async getPickupLocation(serviceRequestId: string): Promise<{ latitude: number; longitude: number } | null> {
    const rows = await this.prisma.$queryRaw<{ latitude: number; longitude: number }[]>`
      SELECT ST_Y("pickupLocation"::geometry) AS latitude, ST_X("pickupLocation"::geometry) AS longitude
      FROM service_requests
      WHERE id = ${serviceRequestId} AND "pickupLocation" IS NOT NULL
    `;
    return rows[0] ?? null;
  }

  /**
   * The ONLY method permitted to change ServiceRequest.status (Ch19, ADR 0004).
   * Every other module reacts to a change via a domain event (see
   * common/events/domain-events.ts) — never by writing this column directly.
   */
  async transition(id: string, to: RequestStatus) {
    const request = await this.findById(id);
    assertValidTransition(request.status as unknown as RequestStatus, to);
    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: { status: to as unknown as PrismaRequestStatus },
    });

    if (to === RequestStatus.COMPLETED) {
      // Payment (Ch57) reacts to this — see PaymentModule's @OnEvent listener.
      this.events.emit(DomainEvents.RequestCompleted, {
        serviceRequestId: id,
      } satisfies RequestCompletedEvent);
    }

    return updated;
  }

  /**
   * Copies vehicle fields at request-creation time so a later edit to the
   * customer's Vehicle record never silently changes a historical request —
   * see docs/domain-model.md's "Why a snapshot" note.
   */
  private async resolveVehicleSnapshot(vehicleId?: string) {
    if (!vehicleId) {
      return {
        vehicleSnapshotMake: "Unspecified",
        vehicleSnapshotModel: "Unspecified",
        vehicleSnapshotYear: null as number | null,
        vehicleSnapshotPlateNumber: "UNSPECIFIED",
      };
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    return {
      vehicleSnapshotMake: vehicle.make,
      vehicleSnapshotModel: vehicle.model,
      vehicleSnapshotYear: vehicle.year,
      vehicleSnapshotPlateNumber: vehicle.plateNumber,
    };
  }
}
