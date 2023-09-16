import { Choreography, Located, Projector } from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

function moveAndPrint<L extends string, L1 extends L, L2 extends L>(
  from: L1,
  to: L2,
) {
  const c: Choreography<
    L,
    [Located<string, L1>],
    [Located<string, L2>]
  > = async ({ comm, locally }, [msgAtSender]) => {
    const msgAtReceiver = await comm(from, to, msgAtSender);
    locally(to, (unwrap) => {
      console.log(`received at ${to}:`, unwrap(msgAtReceiver));
    });
    return [msgAtReceiver];
  };
  return c;
}

const locations = ["alice", "bob", "carol"] as const;
type Location = (typeof locations)[number];

const choreography: Choreography<Location, [], []> = async ({
  locally,
  call,
}) => {
  const msgAtAlice = await locally("alice", () => "message from alice");
  const c = moveAndPrint("alice", "bob");
  const [msgAtBob] = await call(c, [msgAtAlice]);
  await call(moveAndPrint("bob", "carol"), [msgAtBob]);
  return [];
};

async function main() {
  const config: HttpConfig<Location> = {
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

  await Promise.all(
    [aliceProjector, bobProjector, carolProjector].map((p) =>
      p.epp(choreography)([]),
    ),
  );
  await Promise.all([
    aliceProjector.transport.teardown(),
    bobProjector.transport.teardown(),
    carolProjector.transport.teardown(),
  ]);
}

main();
