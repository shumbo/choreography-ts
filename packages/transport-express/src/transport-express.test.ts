import { Choreography, Located, Projector } from "@choreography-ts/core";
import { ExpressTransport, HttpConfig } from "./transport-express.js";

const locations = ["alice", "bob", "carol"] as const;
type Locations = (typeof locations)[number];

const config: HttpConfig<Locations> = {
  alice: ["127.0.0.1", 3010],
  bob: ["127.0.0.1", 3011],
  carol: ["127.0.0.1", 3012],
};

describe("Local Transport", () => {
  test("hello, world", async () => {
    const c: Choreography<Locations, [], [Located<string, "bob">]> = async ({
      locally,
      comm,
    }) => {
      const msg = await locally("alice", () => "Hello, world!");
      const msgAtBob = await comm("alice", "bob", msg);
      await locally("bob", (unwrap) => {
        console.log(unwrap(msgAtBob));
      });
      return [msgAtBob];
    };
    const alice = async () => {
      const transport = await ExpressTransport.create(config, "alice");
      const projector = new Projector(transport, "alice");
      await projector.epp(c)([]);
      await transport.teardown();
    };
    const bob = async () => {
      const transport = await ExpressTransport.create(config, "bob");
      const projector = new Projector(transport, "bob");
      const [msgAtBob] = await projector.epp(c)([]);
      await transport.teardown();
      return msgAtBob;
    };
    const [, msgAtBob] = await Promise.all([alice(), bob()]);
    expect(msgAtBob).toEqual("Hello, world!");
  });
});
