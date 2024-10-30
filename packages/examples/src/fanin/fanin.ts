import esMain from "es-main";

import { Choreography, Projector } from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

export type Locations = "alice" | "bob" | "carol";

export const fanin_test: Choreography<Locations, [], []> = async ({
  fanin,
  locally,
}) => {
  const m = await fanin(
    ["bob", "carol"],
    ["alice"],
    (loc) =>
      async ({ locally, comm }) => {
        const msgAtLoc = await locally(loc, () => `Hello from ${loc}!`);
        const msgAtAlice = await comm(loc, "alice", msgAtLoc);
        return msgAtAlice;
      }
  );
  locally("alice", (unwrap) =>
    console.log(
      `Bob said "${unwrap(m).bob}" and Carol said "${unwrap(m).carol}"`
    )
  );
  return [];
};

async function main() {
  const config: HttpConfig<Locations> = {
    alice: ["localhost", 3000],
    bob: ["localhost", 3001],
    carol: ["localhost", 3002],
  };
  const [aliceTransport, bobTransport, carolTransport] = await Promise.all([
    ExpressTransport.create(config, "alice"),
    ExpressTransport.create(config, "bob"),
    ExpressTransport.create(config, "carol"),
  ]);

  const aliceProjector = new Projector(aliceTransport, "alice");
  const bobProjector = new Projector(bobTransport, "bob");
  const carolProjector = new Projector(carolTransport, "carol");

  const alice = aliceProjector.epp(fanin_test);
  const bob = bobProjector.epp(fanin_test);
  const carol = carolProjector.epp(fanin_test);

  await Promise.all([alice([]), bob([]), carol([])]);
  await Promise.all([
    aliceTransport.teardown(),
    bobTransport.teardown(),
    carolTransport.teardown(),
  ]);
}

if (esMain(import.meta)) {
  main();
}
