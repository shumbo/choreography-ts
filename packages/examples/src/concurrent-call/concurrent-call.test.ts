import { ExpressBackend } from "@choreography-ts/backend-express";
import { L, concurrentCall } from "./concurrent-call";

describe("concurrentCall", () => {
  it("order 1", async () => {
    const backend = new ExpressBackend<L>({
      alice: ["localhost", 3000],
      bob: ["localhost", 3001],
    });
    const alice = backend.epp(concurrentCall, "alice");
    const bob = backend.epp(concurrentCall, "bob");
    const [_, ret] = await Promise.all([
      alice([0, 100]),
      bob([undefined, undefined]),
    ]);
    expect(ret).toEqual([1, 2]);
  });
  it("order 2", async () => {
    const backend = new ExpressBackend<L>({
      alice: ["localhost", 3000],
      bob: ["localhost", 3001],
    });
    const alice = backend.epp(concurrentCall, "alice");
    const bob = backend.epp(concurrentCall, "bob");
    const [_, ret] = await Promise.all([
      alice([100, 0]),
      bob([undefined, undefined]),
    ]);
    expect(ret).toEqual([1, 2]);
  });
});
