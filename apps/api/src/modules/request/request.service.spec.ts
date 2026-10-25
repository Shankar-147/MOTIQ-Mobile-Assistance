import { RequestService } from "./request.service";

describe("RequestService.countRequestsByDay", () => {
  it("returns one bucket per day covering the requested range", async () => {
    const prisma = {
      serviceRequest: {
        // Relative to now, not a fixed date — countRequestsByDay computes
        // `since` from the real Date.now(), so a hardcoded historical date
        // would never fall within the bucketed range regardless of what
        // findMany is mocked to return.
        findMany: jest.fn().mockResolvedValue([{ createdAt: new Date(Date.now() - 86_400_000) }]),
      },
    };
    const service = new RequestService(prisma as never, {} as never, {} as never);

    const result = await service.countRequestsByDay(2);

    expect(prisma.serviceRequest.findMany).toHaveBeenCalledWith({
      where: { createdAt: { gte: expect.any(Date) } },
      select: { createdAt: true },
    });
    expect(result).toHaveLength(3);
    expect(result.reduce((sum, r) => sum + r.count, 0)).toBe(1);
  });
});
