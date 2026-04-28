import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetForTesting, setSyncState, syncState } from "./annunciator-store";

beforeEach(() => {
  vi.useFakeTimers();
  _resetForTesting();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("annunciator-store", () => {
  it("setSyncState('offline') does not update synchronously", () => {
    setSyncState("offline");
    expect(syncState()).toBe("online");
  });

  it("setSyncState('offline') flips after 2s", () => {
    setSyncState("offline");
    vi.advanceTimersByTime(2000);
    expect(syncState()).toBe("offline");
  });

  it("offline transient absorbed if online arrives within 2s", () => {
    setSyncState("offline");
    vi.advanceTimersByTime(1000);
    setSyncState("online");
    vi.advanceTimersByTime(2000);
    expect(syncState()).toBe("online");
  });

  it("setSyncState('error') transitions immediately", () => {
    setSyncState("error");
    expect(syncState()).toBe("error");
  });

  it("setSyncState('conflict') transitions immediately", () => {
    setSyncState("conflict");
    expect(syncState()).toBe("conflict");
  });
});
