import { describe, beforeAll, afterAll, expect, it } from "vitest";
import getPort from "get-port";

import {
  ExpressTransport,
  HttpConfig,
} from "@choreography-ts/transport-express";
import { L, concurrentCall } from "./concurrent-call";
import { Projector } from "@choreography-ts/core";

let aliceProjector: Projector<L, "alice">;
let bobProjector: Projector<L, "bob">;

describe("concurrentCall", () => {
  beforeAll(async () => {
    const config: HttpConfig<L> = {
      alice: ["localhost", await getPort()],
      bob: ["localhost", await getPort()],
    };
    const [aliceTransport, bobTransport] = await Promise.all([
      ExpressTransport.create(config, "alice"),
      ExpressTransport.create(config, "bob"),
    ]);
    aliceProjector = new Projector(aliceTransport, "alice");
    bobProjector = new Projector(bobTransport, "bob");
  });
  afterAll(async () => {
    await Promise.all([
      aliceProjector.transport.teardown(),
      bobProjector.transport.teardown(),
    ]);
  });
  it("order 1", async () => {
    const alice = aliceProjector.epp(concurrentCall);
    const bob = bobProjector.epp(concurrentCall);
    const [_, [x, y]] = await Promise.all([
      alice([aliceProjector.local(0), aliceProjector.local(100)]),
      bob([bobProjector.remote("alice"), bobProjector.remote("alice")]),
    ]);
    expect([bobProjector.unwrap(x), bobProjector.unwrap(y)]).toEqual([1, 2]);
  });
  it("order 2", async () => {
    const alice = aliceProjector.epp(concurrentCall);
    const bob = bobProjector.epp(concurrentCall);
    const [_, [x, y]] = await Promise.all([
      alice([aliceProjector.local(100), aliceProjector.local(0)]),
      bob([bobProjector.remote("alice"), bobProjector.remote("alice")]),
    ]);
    expect([bobProjector.unwrap(x), bobProjector.unwrap(y)]).toEqual([1, 2]);
  });
});
