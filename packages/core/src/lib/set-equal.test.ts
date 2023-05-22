import { setEqual } from "./set-equal.js";

describe("set", () => {
  it("empty sets are equal", () => {
    expect(setEqual(new Set(), new Set())).toBe(true);
  });
  it("sets with different sizes are not equal", () => {
    expect(setEqual(new Set([1]), new Set())).toBe(false);
  });
  it("sets with different elements are not equal", () => {
    expect(setEqual(new Set([1]), new Set([2]))).toBe(false);
  });
  it("subsets are not equal", () => {
    expect(setEqual(new Set([1]), new Set([1, 2]))).toBe(false);
    expect(setEqual(new Set([1, 2]), new Set([1]))).toBe(false);
  });
});
