import { Projector } from "@choreography-ts/core";
import {
  ExpressTransport,
  HttpConfig,
} from "@choreography-ts/transport-express";
import { L } from "../concurrent-call/concurrent-call";
import { diffieHellman } from "./diffie-hellman";

let aliceProjector: Projector<L, "alice">;
let bobProjector: Projector<L, "bob">;

// Test the diffie hellman implementation using Jest
describe("Diffie Hellman", () => {
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
  it("should return the same shared key", async () => {
    const keyExchange = diffieHellman("alice", "bob");
    const [[s1, _a], [_b, s2]] = await Promise.all([
      aliceProjector.epp(keyExchange)([false]),
      bobProjector.epp(keyExchange)([undefined]),
    ]);
    expect(s1).toEqual(s2); // The shared key should be the same
  });
});
