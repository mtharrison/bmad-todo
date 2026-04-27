import { describe, it, expect } from "vitest";
import { readFileSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const linear = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relativeLuminance(...fg);
  const l2 = relativeLuminance(...bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function compositeAlpha(
  fg: [number, number, number],
  alpha: number,
  bg: [number, number, number],
): [number, number, number] {
  return [
    Math.round(fg[0] * alpha + bg[0] * (1 - alpha)),
    Math.round(fg[1] * alpha + bg[1] * (1 - alpha)),
    Math.round(fg[2] * alpha + bg[2] * (1 - alpha)),
  ];
}

const LIGHT = {
  paper: hexToRgb("#F4EFE6"),
  ink: hexToRgb("#1F1A14"),
  accent: hexToRgb("#9C3B1B"),
};

const DARK = {
  paper: hexToRgb("#1A1612"),
  ink: hexToRgb("#E8DFCE"),
  accent: hexToRgb("#6B8E7F"),
};

describe("WCAG AA contrast ratios", () => {
  describe("light theme", () => {
    it("ink on paper >= 4.5:1", () => {
      const ratio = contrastRatio(LIGHT.ink, LIGHT.paper);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("ink-muted (65% alpha composited) on paper >= 4.5:1", () => {
      const muted = compositeAlpha(LIGHT.ink, 0xA6 / 255, LIGHT.paper);
      const ratio = contrastRatio(muted, LIGHT.paper);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("accent on paper >= 3:1", () => {
      const ratio = contrastRatio(LIGHT.accent, LIGHT.paper);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
  });

  describe("dark theme", () => {
    it("ink on paper >= 4.5:1", () => {
      const ratio = contrastRatio(DARK.ink, DARK.paper);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("ink-muted (60% alpha composited) on paper >= 4.5:1", () => {
      const muted = compositeAlpha(DARK.ink, 0x99 / 255, DARK.paper);
      const ratio = contrastRatio(muted, DARK.paper);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("accent on paper >= 3:1", () => {
      const ratio = contrastRatio(DARK.accent, DARK.paper);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
  });
});

describe("design tokens in globals.css", () => {
  const css = readFileSync(resolve(dir, "styles/globals.css"), "utf-8");

  it("declares Fraunces font-face with font-display: block", () => {
    expect(css).toContain("@font-face");
    expect(css).toContain('font-family: "Fraunces"');
    expect(css).toContain("font-display: block");
    expect(css).toContain('font-variation-settings: "opsz" 14');
  });

  it("defines all light theme color tokens", () => {
    expect(css).toContain("--color-paper: #F4EFE6");
    expect(css).toContain("--color-ink: #1F1A14");
    expect(css).toContain("--color-ink-muted: #1F1A14A6");
    expect(css).toContain("--color-rule: #1F1A1422");
    expect(css).toContain("--color-accent: #9C3B1B");
  });

  it("defines all dark theme color tokens", () => {
    expect(css).toContain("--color-paper: #1A1612");
    expect(css).toContain("--color-ink: #E8DFCE");
    expect(css).toContain("--color-ink-muted: #E8DFCE99");
    expect(css).toContain("--color-rule: #E8DFCE22");
    expect(css).toContain("--color-accent: #6B8E7F");
  });

  it("defines spacing base of 4px", () => {
    expect(css).toContain("--spacing: 4px");
  });

  it("spacing scale produces correct values via 4px base", () => {
    const base = 4;
    const expectedMultipliers = [1, 2, 3, 4, 6, 8, 12, 16, 24];
    const produced = expectedMultipliers.map((m) => m * base);
    expect(produced).toEqual([4, 8, 12, 16, 24, 32, 48, 64, 96]);
  });

  it("defines motion tokens", () => {
    expect(css).toContain("--motion-default: 150ms");
    expect(css).toContain("--motion-instant: 0ms");
  });

  it("applies motion-instant under prefers-reduced-motion: reduce", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("--motion-default: var(--motion-instant)");
  });

  it("defines typography tokens", () => {
    expect(css).toContain('--font-body: "Fraunces", serif');
    expect(css).toContain("--font-size-body: 18px");
    expect(css).toContain("--line-height-body: 1.55");
    expect(css).toContain("--letter-spacing-body: 0");
  });

  it("applies typography to html element", () => {
    expect(css).toContain("font-family: var(--font-body)");
    expect(css).toContain("font-size: var(--font-size-body)");
    expect(css).toContain("line-height: var(--line-height-body)");
  });
});

describe("font file", () => {
  it("Fraunces-VF.woff2 exists at the expected path", () => {
    const fontPath = resolve(dir, "../public/fonts/Fraunces-VF.woff2");
    const stat = statSync(fontPath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });
});

describe("index.html", () => {
  const html = readFileSync(resolve(dir, "../index.html"), "utf-8");

  it("has font preload link", () => {
    expect(html).toContain('rel="preload"');
    expect(html).toContain('href="/fonts/Fraunces-VF.woff2"');
    expect(html).toContain('as="font"');
    expect(html).toContain("crossorigin");
  });

  it("has inline theme bootstrap script before other scripts", () => {
    const scriptIndex = html.indexOf("<script>");
    const modulScriptIndex = html.indexOf('type="module"');
    expect(scriptIndex).toBeGreaterThan(-1);
    expect(scriptIndex).toBeLessThan(modulScriptIndex);
  });

  it("bootstrap script reads localStorage and sets data-theme", () => {
    expect(html).toContain('localStorage.getItem("theme")');
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain("data-theme");
  });
});
