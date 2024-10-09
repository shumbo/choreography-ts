import esMain from "es-main";

import {
  Choreography,
  Located,
  Runner,
  Projector,
} from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

export type Locations = "alice" | "bob" | "carol";

export const fanout_test: Choreography<Locations, [], []> = async ({
  locally,
  fanout,
}) => {
  const x = await fanout(
    ["bob", "carol"],
    <Q extends "bob" | "carol">(loc: Q) =>
      async ({ locally, comm }) => {
        const msgAtAlice = await locally("alice", () => `Hi ${loc}!`);
        const msgAtLoc = await comm("alice", loc, msgAtAlice);
        return [msgAtLoc];
      }
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

  const alice = aliceProjector.epp(fanout_test);
  const bob = bobProjector.epp(fanout_test);
  const carol = carolProjector.epp(fanout_test);

  const ret = await Promise.all([alice([]), bob([]), carol([])]);
  console.log(ret);
  await Promise.all([
    aliceTransport.teardown(),
    bobTransport.teardown(),
    carolTransport.teardown(),
  ]);
}

if (esMain(import.meta)) {
  main();
}
