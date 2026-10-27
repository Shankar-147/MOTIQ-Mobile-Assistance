import { buildModelChain, normalizeApiKey, parseModelList } from "./openrouter-config.util";

describe("normalizeApiKey", () => {
  it("strips quotes, spaces and line breaks", () => {
    expect(normalizeApiKey('  "sk-or-v1-abc"  ')).toBe("sk-or-v1-abc");
    expect(normalizeApiKey("sk-or-v1-abc\n")).toBe("sk-or-v1-abc");
    expect(normalizeApiKey("'sk-or-v1-abc'")).toBe("sk-or-v1-abc");
    expect(normalizeApiKey("sk-or-v1-a bc")).toBe("sk-or-v1-abc");
  });
  it("treats blank as no key", () => {
    expect(normalizeApiKey("")).toBeUndefined();
    expect(normalizeApiKey("   ")).toBeUndefined();
    expect(normalizeApiKey('""')).toBeUndefined();
    expect(normalizeApiKey(undefined)).toBeUndefined();
  });
});

describe("model chain", () => {
  it("parses a comma list", () => {
    expect(parseModelList(" a:free, b:free ,, c ")).toEqual(["a:free", "b:free", "c"]);
    expect(parseModelList(undefined)).toEqual([]);
  });
  it("puts the primary first and removes duplicates", () => {
    expect(buildModelChain("a", ["b", "a", "c"], ["x"])).toEqual(["a", "b", "c"]);
  });
  it("never exceeds the three models OpenRouter accepts", () => {
    expect(buildModelChain("a", ["b", "c", "d", "e"], ["x"])).toEqual(["a", "b", "c"]);
  });
  it("falls back to the defaults when nothing is configured", () => {
    expect(buildModelChain(undefined, [], ["x", "y"])).toEqual(["x", "y"]);
  });
});
