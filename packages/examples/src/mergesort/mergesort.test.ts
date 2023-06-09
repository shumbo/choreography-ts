import { ExpressBackend } from "@choreography-ts/backend-express";
import { sort, Location } from "./mergesort";

describe("mergesort", () => {
  it("should sort the array", async () => {
    const backend = new ExpressBackend<Location>({
      primary: ["localhost", 3000],
      worker1: ["localhost", 3001],
      worker2: ["localhost", 3002],
    });
    const mergesort = sort("primary", "worker1", "worker2");
    const [[sorted]] = await Promise.all([
      backend.epp(mergesort, "primary")([[9, 7, 5, 1, 0, 8, 3, 4, 2, 6]]),
      backend.epp(mergesort, "worker1")([undefined]),
      backend.epp(mergesort, "worker2")([undefined]),
    ]);
    expect(sorted).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
