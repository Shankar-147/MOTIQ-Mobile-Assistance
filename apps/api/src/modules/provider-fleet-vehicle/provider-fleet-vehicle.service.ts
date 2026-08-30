import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateProviderFleetVehicleDto } from "./dto/create-provider-fleet-vehicle.dto";
import { UpdateProviderFleetVehicleDto } from "./dto/update-provider-fleet-vehicle.dto";

/** Ch72's mobile Provider app Profile screen — the fleet-vehicle equivalent
 * of VehicleService, previously schema-only (see provider.module.ts's own
 * "Owns ProviderProfile and ProviderFleetVehicle" comment, which had no
 * matching CRUD until now). */
@Injectable()
export class ProviderFleetVehicleService {
  constructor(private readonly prisma: PrismaService) {}

  async listByProvider(providerProfileId: string) {
    return this.prisma.providerFleetVehicle.findMany({
      where: { providerProfileId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(providerProfileId: string, dto: CreateProviderFleetVehicleDto) {
    return this.prisma.providerFleetVehicle.create({
      data: { providerProfileId, ...dto },
    });
  }

  async update(id: string, providerProfileId: string, dto: UpdateProviderFleetVehicleDto) {
    await this.findOwned(id, providerProfileId);
    return this.prisma.providerFleetVehicle.update({ where: { id }, data: dto });
  }

  async remove(id: string, providerProfileId: string) {
    await this.findOwned(id, providerProfileId);
    await this.prisma.providerFleetVehicle.delete({ where: { id } });
  }

  private async findOwned(id: string, providerProfileId: string) {
    const vehicle = await this.prisma.providerFleetVehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`ProviderFleetVehicle ${id} not found`);
    }
    if (vehicle.providerProfileId !== providerProfileId) {
      throw new ForbiddenException("You can only manage your own fleet vehicles.");
    }
    return vehicle;
  }
}
