import "fake-indexeddb/auto";

// Default jsdom does not provide matchMedia. The theme-store eagerly calls
// resolveTheme() at module load, which reaches for window.matchMedia. Provide a
// no-preference stub so module imports don't blow up; individual tests may still
// override window.matchMedia per-test.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (() =>
    ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as Window["matchMedia"];
}

// Default fetch stub for tests that do not explicitly mock fetch.
// Reconcile / outbox-drain calls during component tests should fail fast and
// be swallowed by the sync layer's try/catch — never bubble up.
if (typeof globalThis.fetch !== "function") {
  globalThis.fetch = () =>
    Promise.reject(new Error("fetch not available in test")) as ReturnType<typeof fetch>;
}
