import { Choreography, Located, Projector } from "@choreography-ts/core";
import { LocalTransport } from "./transport-local.js";

const locations = ["alice", "bob", "carol"] as const;
type Locations = (typeof locations)[number];

describe("Local Transport", () => {
  test("hello, world", async () => {
    const transport = new LocalTransport(
      locations,
      LocalTransport.createChannel()
    );
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
      const projector = new Projector(transport, "alice");
      await projector.epp(c)([]);
    };
    const bob = async () => {
      const projector = new Projector(transport, "bob");
      const [msgAtBob] = await projector.epp(c)([]);
      return msgAtBob;
    };
    const [, msgAtBob] = await Promise.all([alice(), bob()]);
    expect(msgAtBob).toEqual("Hello, world!");
  });
});
