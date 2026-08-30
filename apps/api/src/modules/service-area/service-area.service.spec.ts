import { NotFoundException } from "@nestjs/common";
import { ServiceAreaService } from "./service-area.service";

describe("ServiceAreaService.resolveForPoint (CLAUDE.md rule 8, ADR 0006)", () => {
  function buildService(options: { queryRawResult: { id: string }[]; areas: { id: string }[] }) {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue(options.queryRawResult),
      serviceArea: {
        findMany: jest.fn().mockResolvedValue(options.areas),
      },
    };
    const service = new ServiceAreaService(prisma as never);
    return { service, prisma };
  }

  it("returns the area whose real boundary polygon contains the point", async () => {
    const { service, prisma } = buildService({
      queryRawResult: [{ id: "area-with-boundary" }],
      areas: [{ id: "area-with-boundary" }, { id: "some-other-area" }],
    });

    const result = await service.resolveForPoint(12.9, 77.6);

    expect(result).toBe("area-with-boundary");
    // The findMany fallback must never even run once a real polygon match exists.
    expect(prisma.serviceArea.findMany).not.toHaveBeenCalled();
  });

  it("falls back to the single existing ServiceArea when no boundary polygon matches", async () => {
    const { service } = buildService({
      queryRawResult: [],
      areas: [{ id: "only-area" }],
    });

    const result = await service.resolveForPoint(12.9, 77.6);

    expect(result).toBe("only-area");
  });

  it("refuses to guess when no boundary matches and multiple ServiceAreas exist", async () => {
    const { service } = buildService({
      queryRawResult: [],
      areas: [{ id: "area-a" }, { id: "area-b" }],
    });

    await expect(service.resolveForPoint(12.9, 77.6)).rejects.toThrow(NotFoundException);
  });

  it("refuses to guess when no boundary matches and zero ServiceAreas exist", async () => {
    const { service } = buildService({
      queryRawResult: [],
      areas: [],
    });

    await expect(service.resolveForPoint(12.9, 77.6)).rejects.toThrow(NotFoundException);
  });
});
