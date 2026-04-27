import { describe, it, expect } from "vitest";
import { generateTickPath } from "./tick-path";

const CANONICAL_CP1 = { x: 4, y: 9.5 };
const CANONICAL_CP2 = { x: 9, y: 7.5 };
const JITTER = 0.4;

function extractControlPoints(path: string) {
  const qSegments = path.match(/Q\s+([\d.]+)\s+([\d.]+)/g);
  if (!qSegments || qSegments.length !== 2) return null;
  return qSegments.map((seg) => {
    const [, x, y] = seg.match(/Q\s+([\d.]+)\s+([\d.]+)/)!;
    return { x: parseFloat(x!), y: parseFloat(y!) };
  });
}

describe("generateTickPath", () => {
  it("returns identical strings for the same seed (determinism)", () => {
    expect(generateTickPath("a")).toBe(generateTickPath("a"));
  });

  it("returns different strings for different seeds (variance)", () => {
    expect(generateTickPath("a")).not.toBe(generateTickPath("b"));
  });

  it("begins with M and contains exactly two Q segments", () => {
    const path = generateTickPath("test-seed");
    expect(path).toMatch(/^M /);
    const qCount = (path.match(/Q /g) || []).length;
    expect(qCount).toBe(2);
  });

  it("jitters control points within ±0.4px of canonical values", () => {
    const cps = extractControlPoints(generateTickPath("seed-check"));
    expect(cps).not.toBeNull();
    const [cp1, cp2] = cps!;
    expect(cp1!.x).toBeGreaterThanOrEqual(CANONICAL_CP1.x - JITTER);
    expect(cp1!.x).toBeLessThanOrEqual(CANONICAL_CP1.x + JITTER);
    expect(cp1!.y).toBeGreaterThanOrEqual(CANONICAL_CP1.y - JITTER);
    expect(cp1!.y).toBeLessThanOrEqual(CANONICAL_CP1.y + JITTER);
    expect(cp2!.x).toBeGreaterThanOrEqual(CANONICAL_CP2.x - JITTER);
    expect(cp2!.x).toBeLessThanOrEqual(CANONICAL_CP2.x + JITTER);
    expect(cp2!.y).toBeGreaterThanOrEqual(CANONICAL_CP2.y - JITTER);
    expect(cp2!.y).toBeLessThanOrEqual(CANONICAL_CP2.y + JITTER);
  });

  it("produces distinct strings across 1000 random seeds", () => {
    const paths = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      paths.add(generateTickPath(`seed-${i}`));
    }
    expect(paths.size).toBe(1000);
  });
});
