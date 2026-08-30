import { OsrmRoutingAdapter } from "./osrm-routing.adapter";

describe("OsrmRoutingAdapter (Ch32's routing adapter, ADR 0007-style mandatory fallback)", () => {
  const from = { latitude: 12.9634, longitude: 80.2434 };
  const to = { latitude: 12.9599, longitude: 80.2458 };
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function buildAdapter() {
    const config = { get: jest.fn().mockReturnValue("https://router.project-osrm.org") };
    return new OsrmRoutingAdapter(config as never);
  }

  it("returns a mapped route on a successful OSRM response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          code: "Ok",
          routes: [
            {
              geometry: { coordinates: [[80.2434, 12.9634], [80.2458, 12.9599]] },
              distance: 550,
              duration: 120,
            },
          ],
        }),
    }) as never;

    const adapter = buildAdapter();
    const result = await adapter.getRoute(from, to);

    expect(result).toEqual({
      geometry: [
        { latitude: 12.9634, longitude: 80.2434 },
        { latitude: 12.9599, longitude: 80.2458 },
      ],
      distanceMeters: 550,
      durationSeconds: 120,
    });
  });

  it("returns null (never throws) on a non-OK HTTP response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as never;
    const adapter = buildAdapter();
    await expect(adapter.getRoute(from, to)).resolves.toBeNull();
  });

  it("returns null when OSRM reports no route found", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code: "NoRoute", routes: [] }),
    }) as never;
    const adapter = buildAdapter();
    await expect(adapter.getRoute(from, to)).resolves.toBeNull();
  });

  it("returns null (never throws) when the network call itself fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as never;
    const adapter = buildAdapter();
    await expect(adapter.getRoute(from, to)).resolves.toBeNull();
  });
});
