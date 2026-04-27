import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { Tick } from "./Tick";

describe("Tick", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders exactly one svg with one path", () => {
    const { container } = render(() => <Tick seed="abc" />);
    expect(container.querySelectorAll("svg").length).toBe(1);
    expect(container.querySelectorAll("path").length).toBe(1);
  });

  it("has viewBox 0 0 14 14 and aria-hidden true", () => {
    const { container } = render(() => <Tick seed="abc" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 14 14");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("produces identical d for the same seed", () => {
    const { container: c1 } = render(() => <Tick seed="same" />);
    const { container: c2 } = render(() => <Tick seed="same" />);
    const d1 = c1.querySelector("path")!.getAttribute("d");
    const d2 = c2.querySelector("path")!.getAttribute("d");
    expect(d1).toBe(d2);
  });

  it("produces different d for different seeds", () => {
    const { container: c1 } = render(() => <Tick seed="alpha" />);
    const { container: c2 } = render(() => <Tick seed="beta" />);
    const d1 = c1.querySelector("path")!.getAttribute("d");
    const d2 = c2.querySelector("path")!.getAttribute("d");
    expect(d1).not.toBe(d2);
  });

  it("renders svg as only child (no extra wrappers)", () => {
    const { container } = render(() => <Tick seed="abc" />);
    const children = Array.from(container.children);
    expect(children.length).toBe(1);
    expect(children[0]!.tagName).toBe("svg");
  });
});
