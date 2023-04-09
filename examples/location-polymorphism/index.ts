import { HttpBackend, Choreography, Located } from "../../src";

function moveAndPrint<L extends string, L1 extends L, L2 extends L>(
  from: L1,
  to: L2
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
  const backend = new HttpBackend<Location>({
    alice: ["localhost", 3000],
    bob: ["localhost", 3001],
    carol: ["localhost", 3002],
  });
  await Promise.all(locations.map((l) => backend.epp(choreography, l)([])));
}

main();
