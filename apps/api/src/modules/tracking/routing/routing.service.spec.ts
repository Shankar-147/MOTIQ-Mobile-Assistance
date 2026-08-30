import { RoutingService } from "./routing.service";

describe("RoutingService.getRouteForRequest", () => {
  const providerProfileId = "provider-1";
  const serviceRequestId = "request-1";
  const providerLocation = { latitude: 12.9634, longitude: 80.2434 };
  const pickupLocation = { latitude: 12.9599, longitude: 80.2458 };

  function buildService(options: {
    providerLocation?: { latitude: number; longitude: number } | null;
    pickupLocation?: { latitude: number; longitude: number } | null;
    straightLineDistanceMeters?: number | null;
    routeResult?: unknown;
  }) {
    const providerService = {
      getCurrentLocation: jest.fn().mockResolvedValue(
        options.providerLocation === undefined ? providerLocation : options.providerLocation,
      ),
      getDistanceToServiceRequestPickup: jest
        .fn()
        .mockResolvedValue(options.straightLineDistanceMeters ?? 500),
    };
    const requestService = {
      findById: jest.fn().mockResolvedValue({
        id: serviceRequestId,
        pickupLocation: options.pickupLocation === undefined ? pickupLocation : options.pickupLocation,
      }),
    };
    const matchingService = {
      getAcceptedAssignment: jest.fn().mockResolvedValue({ providerProfileId }),
    };
    const routingPort = {
      getRoute: jest.fn().mockResolvedValue(options.routeResult ?? null),
    };
    const service = new RoutingService(
      providerService as never,
      requestService as never,
      matchingService as never,
      routingPort as never,
    );
    return { service, providerService, requestService, matchingService, routingPort };
  }

  it("returns a real route's geometry/distance/eta when the routing port succeeds", async () => {
    const { service } = buildService({
      routeResult: { geometry: [providerLocation, pickupLocation], distanceMeters: 600, durationSeconds: 90 },
    });

    const result = await service.getRouteForRequest(serviceRequestId);

    expect(result?.geometry).toEqual([providerLocation, pickupLocation]);
    expect(result?.distanceMeters).toBe(600);
    expect(result?.eta.estimatedMinutes).toBe(2); // 90s -> 1.5min, rounded to 2
  });

  it("falls back to null geometry + straight-line distance/eta when the routing port returns null", async () => {
    const { service } = buildService({ straightLineDistanceMeters: 1000, routeResult: null });

    const result = await service.getRouteForRequest(serviceRequestId);

    expect(result?.geometry).toBeNull();
    expect(result?.distanceMeters).toBe(1000);
    expect(result?.eta).toBeDefined();
  });

  it("returns null when the provider has no current location yet", async () => {
    const { service } = buildService({ providerLocation: null });
    await expect(service.getRouteForRequest(serviceRequestId)).resolves.toBeNull();
  });

  it("returns null when the request has no pickup location", async () => {
    const { service } = buildService({ pickupLocation: null });
    await expect(service.getRouteForRequest(serviceRequestId)).resolves.toBeNull();
  });
});
