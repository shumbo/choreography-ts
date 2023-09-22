import { describe, test, expect } from "vitest";

import { IVar } from "./ivar";

describe("IVar", () => {
  test("read before write", async () => {
    const ivar = new IVar<number>();
    const readPromise = ivar.read();
    ivar.write(42);
    expect(await readPromise).toBe(42);
  });
  test("read after write", async () => {
    const ivar = new IVar<number>();
    ivar.write(42);
    expect(await ivar.read()).toBe(42);
  });
  test("read twice before write", async () => {
    const ivar = new IVar<number>();
    const readPromise1 = ivar.read();
    const readPromise2 = ivar.read();
    ivar.write(42);
    expect(await readPromise1).toBe(42);
    expect(await readPromise2).toBe(42);
  });
  test("read twice after write", async () => {
    const ivar = new IVar<number>();
    ivar.write(42);
    expect(await ivar.read()).toBe(42);
    expect(await ivar.read()).toBe(42);
  });
  test("write twice", async () => {
    const ivar = new IVar<number>();
    ivar.write(42);
    expect(() => ivar.write(42)).toThrow();
  });
});
