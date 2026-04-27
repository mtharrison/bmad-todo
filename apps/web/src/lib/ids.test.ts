import { describe, it, expect } from "vitest";
import { generateId } from "./ids";

describe("generateId", () => {
  it("returns a string of length >= 32", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThanOrEqual(32);
  });

  it("produces monotonically increasing values on consecutive calls", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id2 > id1).toBe(true);
  });
});
