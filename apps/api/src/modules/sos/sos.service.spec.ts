import { SosService } from "./sos.service";

describe("SosService.countAlertsByDay", () => {
  it("returns one bucket per day covering the requested range", async () => {
    const prisma = {
      sosAlert: {
        findMany: jest.fn().mockResolvedValue([{ createdAt: new Date() }, { createdAt: new Date() }]),
      },
    };
    const service = new SosService(prisma as never, {} as never, {} as never);

    const result = await service.countAlertsByDay(7);

    expect(prisma.sosAlert.findMany).toHaveBeenCalledWith({
      where: { createdAt: { gte: expect.any(Date) } },
      select: { createdAt: true },
    });
    expect(result).toHaveLength(8);
    expect(result.reduce((sum, r) => sum + r.count, 0)).toBe(2);
  });
});
