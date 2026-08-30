import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { VehicleType } from "@motiq/types";
import { VehicleService } from "./vehicle.service";

describe("VehicleService (data-access-layer ownership scoping)", () => {
  const owningCustomerProfileId = "customer-1";
  const vehicle = {
    id: "vehicle-1",
    customerProfileId: owningCustomerProfileId,
    vehicleType: VehicleType.CAR,
    make: "Maruti Suzuki",
    model: "Swift",
    year: 2020,
    plateNumber: "KA01AB1234",
  };

  function buildService(overrides: Partial<Record<"findUnique" | "update" | "delete", jest.Mock>> = {}) {
    const prisma = {
      vehicle: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: overrides.findUnique ?? jest.fn().mockResolvedValue(vehicle),
        update: overrides.update ?? jest.fn(),
        delete: overrides.delete ?? jest.fn(),
      },
    };
    return { service: new VehicleService(prisma as never), prisma };
  }

  it("throws NotFoundException when updating a vehicle that doesn't exist", async () => {
    const { service } = buildService({ findUnique: jest.fn().mockResolvedValue(null) });
    await expect(service.update("missing-id", owningCustomerProfileId, {})).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when a customer tries to update another customer's vehicle", async () => {
    const { service } = buildService();
    await expect(service.update(vehicle.id, "someone-else", { make: "Hacked" })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("throws ForbiddenException when a customer tries to delete another customer's vehicle", async () => {
    const { service } = buildService();
    await expect(service.remove(vehicle.id, "someone-else")).rejects.toThrow(ForbiddenException);
  });

  it("allows the owning customer to update their own vehicle", async () => {
    const { service, prisma } = buildService();
    await service.update(vehicle.id, owningCustomerProfileId, { make: "Hyundai" });
    expect(prisma.vehicle.update).toHaveBeenCalledWith({
      where: { id: vehicle.id },
      data: { make: "Hyundai" },
    });
  });

  it("allows the owning customer to delete their own vehicle", async () => {
    const { service, prisma } = buildService();
    await service.remove(vehicle.id, owningCustomerProfileId);
    expect(prisma.vehicle.delete).toHaveBeenCalledWith({ where: { id: vehicle.id } });
  });
});
