import { createSignal } from "solid-js";
import { resolveTheme, applyTheme } from "../theme-bootstrap";

export type Theme = "light" | "dark";

const [themeSignal, setThemeInternal] = createSignal<Theme>(resolveTheme());

export const theme = themeSignal;

export function setTheme(next: Theme): void {
  setThemeInternal(next);
  applyTheme(next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Safari private mode etc. — silent
  }
}

export function toggleTheme(): void {
  setTheme(themeSignal() === "light" ? "dark" : "light");
}
