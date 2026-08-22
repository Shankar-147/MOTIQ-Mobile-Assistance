import { rankProviderCandidates } from "./provider-ranking.util";

describe("rankProviderCandidates", () => {
  it("ranks a closer, equally-trusted candidate above a farther one", () => {
    const [first, second] = rankProviderCandidates([
      { id: "far", distanceMeters: 8000, trustScore: 4 },
      { id: "near", distanceMeters: 500, trustScore: 4 },
    ]);
    expect(first.id).toBe("near");
    expect(second.id).toBe("far");
  });

  it("lets a much more trusted candidate outrank a slightly closer one", () => {
    const [first] = rankProviderCandidates([
      { id: "closer-untrusted", distanceMeters: 1000, trustScore: 0.5 },
      { id: "farther-trusted", distanceMeters: 1500, trustScore: 5 },
    ]);
    expect(first.id).toBe("farther-trusted");
  });

  it("returns every score with a distance/trust breakdown that sums to the score", () => {
    const [ranked] = rankProviderCandidates([{ id: "a", distanceMeters: 2000, trustScore: 3 }]);
    expect(ranked.scoreBreakdown.distanceComponent + ranked.scoreBreakdown.trustComponent).toBeCloseTo(
      ranked.score,
      10,
    );
  });

  it("clamps distance beyond the normalization bound instead of going negative", () => {
    const [ranked] = rankProviderCandidates([{ id: "far", distanceMeters: 50_000, trustScore: 0 }]);
    expect(ranked.scoreBreakdown.distanceComponent).toBe(0);
    expect(ranked.score).toBe(0);
  });

  it("respects custom weights", () => {
    const [first] = rankProviderCandidates(
      [
        { id: "closer", distanceMeters: 1000, trustScore: 0 },
        { id: "trusted", distanceMeters: 9000, trustScore: 5 },
      ],
      { distanceWeight: 0, trustWeight: 1 },
    );
    expect(first.id).toBe("trusted");
  });
});
