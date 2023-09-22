import { describe, test, expect } from "vitest";

import { setEqual } from "./set-equal";

describe("set", () => {
  test("empty sets are equal", () => {
    expect(setEqual(new Set(), new Set())).toBe(true);
  });
  test("sets with different sizes are not equal", () => {
    expect(setEqual(new Set([1]), new Set())).toBe(false);
  });
  test("sets with different elements are not equal", () => {
    expect(setEqual(new Set([1]), new Set([2]))).toBe(false);
  });
  test("subsets are not equal", () => {
    expect(setEqual(new Set([1]), new Set([1, 2]))).toBe(false);
    expect(setEqual(new Set([1, 2]), new Set([1]))).toBe(false);
  });
});
