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
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { assertValidTransition } from "./request-state-machine";

@Injectable()
export class RequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async create(customerProfileId: string, dto: CreateServiceRequestDto) {
    const vehicleSnapshot = await this.resolveVehicleSnapshot(dto.vehicleId);

    const created = await this.prisma.serviceRequest.create({
      data: {
        customerProfileId,
        serviceAreaId: dto.serviceAreaId,
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

  async findById(id: string) {
    const request = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException(`ServiceRequest ${id} not found`);
    }
    return request;
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
