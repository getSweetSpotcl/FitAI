import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll } from "vitest";

// Setup test environment
beforeAll(() => {
  // Mock Next.js router
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class MockIntersectionObserver {
    root = null;
    rootMargin = "";
    thresholds = [];
    observe() {
      return null;
    }
    disconnect() {
      return null;
    }
    unobserve() {
      return null;
    }
    takeRecords() {
      return [];
    }
  } as any;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    observe() {
      return null;
    }
    disconnect() {
      return null;
    }
    unobserve() {
      return null;
    }
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
