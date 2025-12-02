import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, vi } from "vitest";

expect.extend(matchers);

const createMatchMedia = (matches = false) => (query) => ({
  matches: typeof matches === "function" ? matches(query) : matches,
  media: query,
  onchange: null,
  addListener: vi.fn(), // deprecated but used by some libs
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = createMatchMedia(false);
}

export { createMatchMedia };
