import { Choreography, HttpBackend } from "../../src";

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
  if (!locations.includes(location as any)) {
    throw new Error(`Invalid location: ${location}`);
  }
  const backend = new HttpBackend<Locations>({
    alice: ["localhost", 3000],
    bob: ["localhost", 3001],
  });
  await backend.epp(helloWorld, location as any)([]);
}

main(process.argv[2]!);
