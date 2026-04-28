import { describe, it, expect, beforeEach, vi } from "vitest";
import { latencyTracker } from "./latency";

beforeEach(() => {
  latencyTracker._reset();
});

describe("latencyTracker", () => {
  describe("inactive mode", () => {
    it("record methods are no-ops when inactive", () => {
      latencyTracker.recordKeystrokeStart();
      latencyTracker.recordKeystrokeEnd();
      latencyTracker.recordCompletionStart();
      latencyTracker.recordCompletionEnd();
      expect(latencyTracker.getKeystrokeP95()).toBe(0);
      expect(latencyTracker.getCompletionP95()).toBe(0);
    });

    it("isActive returns false by default", () => {
      expect(latencyTracker.isActive()).toBe(false);
    });
  });

  describe("active mode", () => {
    beforeEach(() => {
      latencyTracker.setActive(true);
    });

    it("isActive returns true after setActive(true)", () => {
      expect(latencyTracker.isActive()).toBe(true);
    });

    it("records keystroke samples", () => {
      let now = 0;
      vi.spyOn(performance, "now").mockImplementation(() => now);

      now = 100;
      latencyTracker.recordKeystrokeStart();
      now = 110;
      latencyTracker.recordKeystrokeEnd();

      expect(latencyTracker.getKeystrokeP95()).toBe(10);
    });

    it("records completion samples", () => {
      let now = 0;
      vi.spyOn(performance, "now").mockImplementation(() => now);

      now = 200;
      latencyTracker.recordCompletionStart();
      now = 240;
      latencyTracker.recordCompletionEnd();

      expect(latencyTracker.getCompletionP95()).toBe(40);
    });

    it("calculates p95 with known data", () => {
      let now = 0;
      vi.spyOn(performance, "now").mockImplementation(() => now);

      for (let i = 1; i <= 100; i++) {
        now = 0;
        latencyTracker.recordKeystrokeStart();
        now = i;
        latencyTracker.recordKeystrokeEnd();
      }

      expect(latencyTracker.getKeystrokeP95()).toBe(96);
    });

    it("rolling window evicts oldest samples past 100", () => {
      let now = 0;
      vi.spyOn(performance, "now").mockImplementation(() => now);

      for (let i = 1; i <= 100; i++) {
        now = 0;
        latencyTracker.recordKeystrokeStart();
        now = 1000;
        latencyTracker.recordKeystrokeEnd();
      }

      for (let i = 1; i <= 100; i++) {
        now = 0;
        latencyTracker.recordKeystrokeStart();
        now = i;
        latencyTracker.recordKeystrokeEnd();
      }

      expect(latencyTracker.getKeystrokeP95()).toBe(96);
    });

    it("does not record end without matching start", () => {
      latencyTracker.recordKeystrokeEnd();
      expect(latencyTracker.getKeystrokeP95()).toBe(0);

      latencyTracker.recordCompletionEnd();
      expect(latencyTracker.getCompletionP95()).toBe(0);
    });

    it("returns 0 when no samples exist", () => {
      expect(latencyTracker.getKeystrokeP95()).toBe(0);
      expect(latencyTracker.getCompletionP95()).toBe(0);
    });
  });

  describe("setActive toggle", () => {
    it("stops recording when deactivated mid-session", () => {
      let now = 0;
      vi.spyOn(performance, "now").mockImplementation(() => now);

      latencyTracker.setActive(true);
      now = 0;
      latencyTracker.recordKeystrokeStart();
      now = 5;
      latencyTracker.recordKeystrokeEnd();
      expect(latencyTracker.getKeystrokeP95()).toBe(5);

      latencyTracker.setActive(false);
      now = 0;
      latencyTracker.recordKeystrokeStart();
      now = 999;
      latencyTracker.recordKeystrokeEnd();
      expect(latencyTracker.getKeystrokeP95()).toBe(5);
    });
  });
});
