/**
 * This is a playground file for testing the library.
 *
 * To run this file, use the following command:
 *
 * ```sh
 * pnpm tsx ./playground.ts [alpha|beta]
 * ```
 */

import esMain from "es-main";

import { Choreography, Projector } from "@choreography-ts/core";
import { createInterface } from "readline";
import {
  ExpressTransport,
  HttpConfig,
} from "@choreography-ts/transport-express";

// STEP 1: Define locations
const locations = ["alpha", "beta"] as const;
type Locations = (typeof locations)[number];

// STEP 2: Write a choreography
const mainChoreography: Choreography<Locations, void, void> = async ({
  locally,
  comm,
}) => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const a = await locally("alpha", async () => {
    for (;;) {
      const input = await new Promise<string>((resolve) => {
        rl.question("Enter a number: ", resolve);
      });

      const number = Number(input);
      if (isNaN(number)) {
        console.error("Invalid number input");
      } else {
        return number;
      }
    }
  });
  const a_at_beta = await comm("alpha", "beta", a);
  const b = await locally("beta", async () => {
    const msg = new Promise<string>((resolve) => {
      rl.question("Enter a word for Beta to send to Alpha: ", resolve);
    });
    return msg;
  });
  const b_at_alpha = await comm("beta", "alpha", b);
  await locally("alpha", async (unwrap) => {
    console.log("Alpha received:", unwrap(b_at_alpha));
  });
  await locally("beta", async (unwrap) => {
    console.log("Beta received:", unwrap(a_at_beta));
  });
  rl.close();
};

// STEP 3: Run the choreography
async function main() {
  const config: HttpConfig<Locations> = {
    alpha: ["127.0.0.1", 8000],
    beta: ["127.0.0.1", 8001],
  };
  if (process.argv.length < 3) {
    console.error("Please provide a location");
    return;
  }
  const location = process.argv[2] as Locations;
  if (!config[location]) {
    console.error("Invalid location");
    return;
  }
  if (location === "alpha") {
    const transport = await ExpressTransport.create(config, "alpha");
    const projector = new Projector(transport, "alpha");
    await projector.epp(mainChoreography)();
    await transport.teardown();
  }
  if (location === "beta") {
    const transport = await ExpressTransport.create(config, "beta");
    const projector = new Projector(transport, "beta");
    await projector.epp(mainChoreography)();
    await transport.teardown();
  }
}

if (esMain(import.meta)) {
  main().catch(console.error);
}
