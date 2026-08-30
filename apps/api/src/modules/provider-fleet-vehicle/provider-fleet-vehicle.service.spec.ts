import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { VehicleType } from "@motiq/types";
import { ProviderFleetVehicleService } from "./provider-fleet-vehicle.service";

describe("ProviderFleetVehicleService (data-access-layer ownership scoping)", () => {
  const owningProviderProfileId = "provider-1";
  const vehicle = {
    id: "fleet-vehicle-1",
    providerProfileId: owningProviderProfileId,
    vehicleType: VehicleType.COMMERCIAL,
    make: "Tata",
    model: "Ace",
    plateNumber: "KA01XY9999",
  };

  function buildService(overrides: Partial<Record<"findUnique" | "update" | "delete", jest.Mock>> = {}) {
    const prisma = {
      providerFleetVehicle: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: overrides.findUnique ?? jest.fn().mockResolvedValue(vehicle),
        update: overrides.update ?? jest.fn(),
        delete: overrides.delete ?? jest.fn(),
      },
    };
    return { service: new ProviderFleetVehicleService(prisma as never), prisma };
  }

  it("throws NotFoundException when updating a fleet vehicle that doesn't exist", async () => {
    const { service } = buildService({ findUnique: jest.fn().mockResolvedValue(null) });
    await expect(service.update("missing-id", owningProviderProfileId, {})).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when a provider tries to update another provider's fleet vehicle", async () => {
    const { service } = buildService();
    await expect(service.update(vehicle.id, "someone-else", { make: "Hacked" })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("throws ForbiddenException when a provider tries to delete another provider's fleet vehicle", async () => {
    const { service } = buildService();
    await expect(service.remove(vehicle.id, "someone-else")).rejects.toThrow(ForbiddenException);
  });

  it("allows the owning provider to update their own fleet vehicle", async () => {
    const { service, prisma } = buildService();
    await service.update(vehicle.id, owningProviderProfileId, { make: "Mahindra" });
    expect(prisma.providerFleetVehicle.update).toHaveBeenCalledWith({
      where: { id: vehicle.id },
      data: { make: "Mahindra" },
    });
  });

  it("allows the owning provider to delete their own fleet vehicle", async () => {
    const { service, prisma } = buildService();
    await service.remove(vehicle.id, owningProviderProfileId);
    expect(prisma.providerFleetVehicle.delete).toHaveBeenCalledWith({ where: { id: vehicle.id } });
  });
});
