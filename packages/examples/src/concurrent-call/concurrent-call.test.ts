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
      alice: ["localhost", 3000],
      bob: ["localhost", 3001],
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
    const [_, ret] = await Promise.all([
      alice([0, 100]),
      bob([undefined, undefined]),
    ]);
    expect(ret).toEqual([1, 2]);
  });
  it("order 2", async () => {
    const alice = aliceProjector.epp(concurrentCall);
    const bob = bobProjector.epp(concurrentCall);
    const [_, ret] = await Promise.all([
      alice([100, 0]),
      bob([undefined, undefined]),
    ]);
    expect(ret).toEqual([1, 2]);
  });
});
