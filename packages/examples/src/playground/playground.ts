/**
 * This is a playground file for testing the library.
 *
 * To run this file, use the following command:
 *
 * ```sh
 * pnpm tsx ./playground.ts
 * ```
 */

import esMain from "es-main";

import { Choreography, Projector, LocalTransport } from "@choreography-ts/core";

// STEP 1: Define locations
const locations = ["alice", "bob"] as const;
type Locations = (typeof locations)[number];

// STEP 2: Write a choreography
const mainChoreography: Choreography<Locations, void, void> = async ({
  locally,
  comm,
}) => {
  const randomNumberAtAlice = await locally("alice", () => {
    const randomNumber = Math.random();
    console.log(`Alice generated random number: ${randomNumber}`);
    return randomNumber;
  });
  const randomNumberAtBob = await comm("alice", "bob", randomNumberAtAlice);
  locally("bob", (unwrap) => {
    console.log(`Bob received random number: ${unwrap(randomNumberAtBob)}`);
  });
  return;
};

// STEP 3: Run the choreography
async function main() {
  const channel = LocalTransport.createChannel(locations);
  const tasks: Promise<void>[] = [];
  for (const target of locations) {
    // Use the `LocalTransport` for the demo purpose.
    const transport = new LocalTransport(locations, target, channel);
    const projector = new Projector(transport, target);
    tasks.push(projector.epp(mainChoreography)());
  }
  await Promise.all(tasks);
}

if (esMain(import.meta)) {
  main().catch(console.error);
}
