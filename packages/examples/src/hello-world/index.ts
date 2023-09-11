import { Choreography, Projector } from "@choreography-ts/core";
import {
  ExpressTransport,
  HttpConfig,
} from "@choreography-ts/transport-express";

const locations = ["alice", "bob"] as const;
type Locations = (typeof locations)[number];

const helloWorld: Choreography<Locations> = async ({ locally, comm }) => {
  const msg = await locally("alice", () => "Hello, world!");
  const msgAtBob = await comm("alice", "bob", msg);
  await locally("bob", (unwrap) => {
    console.log(unwrap(msgAtBob));
  });
  return [];
};

async function main(location: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!locations.includes(location as any)) {
    throw new Error(`Invalid location: ${location}`);
  }

  const config: HttpConfig<Locations> = {
    alice: ["localhost", 3000],
    bob: ["localhost", 3001],
  };

  if (location === "alice") {
    const aliceTransport = await ExpressTransport.create(config, "alice");
    const aliceProjector = new Projector(aliceTransport, "alice");
    await aliceProjector.epp(helloWorld)([]);
    await aliceTransport.teardown();
  } else {
    const bobTransport = await ExpressTransport.create(config, "bob");
    const bobProjector = new Projector(bobTransport, "bob");
    await bobProjector.epp(helloWorld)([]);
    await bobTransport.teardown();
  }
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
main(process.argv[2]!);
