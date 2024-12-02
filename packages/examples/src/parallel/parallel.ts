import esMain from "es-main";

import { Choreography, Runner } from "@choreography-ts/core";

export type Locations = "alice" | "bob" | "carol";

export const parallel_test: Choreography<Locations, [], []> = async ({
  parallel,
}) => {
  await parallel(["alice", "bob", "carol"], async (location) => {
    console.log(`Hello from ${location}`);
    return location;
  });
  return [];
};

async function main() {
  const runner = new Runner();
  const fn = runner.compile(parallel_test);
  await fn([]);
}

if (esMain(import.meta)) {
  main();
}
