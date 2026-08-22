import { Injectable, NotFoundException } from "@nestjs/common";
import { RequestStatus as PrismaRequestStatus } from "@prisma/client";
import { RequestStatus } from "@motiq/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { assertValidTransition } from "./request-state-machine";

@Injectable()
export class RequestService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceRequestDto) {
    const vehicleSnapshot = await this.resolveVehicleSnapshot(dto.vehicleId);

    const created = await this.prisma.serviceRequest.create({
      data: {
        customerProfileId: dto.customerProfileId,
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
   * Every other module reacts to a change via the (future) RequestStatusChanged
   * domain event — never by writing this column directly.
   */
  async transition(id: string, to: RequestStatus) {
    const request = await this.findById(id);
    assertValidTransition(request.status as unknown as RequestStatus, to);
    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status: to as unknown as PrismaRequestStatus },
    });
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
