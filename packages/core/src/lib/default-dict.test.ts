import { describe, test, expect } from "vitest";

import { DefaultDict } from "./default-dict";

describe("DefaultDict", () => {
  test("get before set", () => {
    const dict = new DefaultDict<string, number>(() => 42);
    expect(dict.get("foo")).toBe(42);
  });
  test("get after set", () => {
    const dict = new DefaultDict<string, number>(() => 42);
    dict.set("foo", 43);
    expect(dict.get("foo")).toBe(43);
  });
  test("get twice before set", () => {
    const dict = new DefaultDict<string, number>(() => 42);
    expect(dict.get("foo")).toBe(42);
    expect(dict.get("foo")).toBe(42);
  });
  test("falsy default", () => {
    const dict = new DefaultDict<string, number>(() => 0);
    expect(dict.get("foo")).toBe(0);
  });
});
