import { InMemoryLogManager } from "./in-memory-log-manager";

describe("InMemoryLogManager", () => {
  test("write and read", async () => {
    const lm = new InMemoryLogManager();
    const lid = "test-lid";
    const data = { foo: "bar" };
    await lm.write(lid, data);
    const result = await lm.read(lid);
    expect(result).toEqual({ ok: true, value: data });
  });
  test("read missing", async () => {
    const lm = new InMemoryLogManager();
    const lid = "test-lid";
    const result = await lm.read(lid);
    expect(result).toEqual({ ok: false });
  });
});
