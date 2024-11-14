import { describe, beforeAll, afterAll, expect, it } from "vitest";
import getPort from "get-port";

import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

import { sort, Location } from "./mergesort";
import { Projector } from "@choreography-ts/core";

let primaryProjector: Projector<Location, "primary">;
let worker1Projector: Projector<Location, "worker1">;
let worker2Projector: Projector<Location, "worker2">;

describe("mergesort", () => {
  beforeAll(async () => {
    const config: HttpConfig<Location> = {
      primary: ["localhost", await getPort()],
      worker1: ["localhost", await getPort()],
      worker2: ["localhost", await getPort()],
    };
    const [primaryTransport, worker1Transport, worker2Transport] =
      await Promise.all([
        ExpressTransport.create(config, "primary"),
        ExpressTransport.create(config, "worker1"),
        ExpressTransport.create(config, "worker2"),
      ]);

    primaryProjector = new Projector(primaryTransport, "primary");
    worker1Projector = new Projector(worker1Transport, "worker1");
    worker2Projector = new Projector(worker2Transport, "worker2");
  });
  afterAll(async () => {
    await Promise.all([
      primaryProjector.transport.teardown(),
      worker1Projector.transport.teardown(),
      worker2Projector.transport.teardown(),
    ]);
  });

  it("should sort the array", async () => {
    const mergesort = sort("primary", "worker1", "worker2");
    const [[sorted]] = await Promise.all([
      primaryProjector.epp(mergesort)([
        primaryProjector.local([9, 7, 5, 1, 0, 8, 3, 4, 2, 6]),
      ]),
      worker1Projector.epp(mergesort)([worker1Projector.remote("primary")]),
      worker2Projector.epp(mergesort)([worker2Projector.remote("primary")]),
    ]);
    expect(primaryProjector.unwrap(sorted)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });
});
