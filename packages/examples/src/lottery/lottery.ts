import {
  Choreography,
  Projector,
  Location,
  MultiplyLocated,
} from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";
import esMain from "es-main";
import readline from "readline";
import { createHash } from 'node:crypto'
import Field from "./finiteField";

const field = new Field(999983);

type FiniteField = number;

const hash = (rho: number, psi: number) => createHash('sha256').update((rho + psi).toString()).digest('hex')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

const maxSalt = 2 ^ 18;
const minSalt = 2 ^ 20;

export const lottery = <SL extends Location, CL extends Location>(
  serverLocations: SL[], clientLocations: CL[], askQuestion: (query: string) => Promise<string>
): Choreography<"analyst" | SL | CL, undefined, MultiplyLocated<FiniteField, "analyst">> =>
  async ({ locally, fanin, fanout, parallel }) => {
    const secret = await parallel(clientLocations, async () => {
      const secretStr = await askQuestion("Secret: ");
      return parseInt(secretStr);
    });

    const clientShares = await parallel(clientLocations, async (_, unwrap) => {
      const freeShares = Array.from({ length: serverLocations.length - 1 }, () => field.rand());
      const lastShare = field.sub(unwrap(secret),
        freeShares.reduce((a, b) => field.add(a, b), field.zero));
      const shares = freeShares.concat(lastShare);
      const serverToShares: Record<string, FiniteField> = {};
      for (const [index, server] of serverLocations.entries()) {
        serverToShares[server] = shares[index] as FiniteField;
      }
      return serverToShares;
    });

    const serverShares = await fanout(serverLocations, (server) =>
      async ({ fanin }) => fanin(clientLocations, [server], (client) =>
        async ({ locally, comm }) => {
          const share = await locally(client, (unwrap) => unwrap(clientShares)[server]);
          return comm(client, server, share);
        })
    );

    // 1) Each server selects a random number; τ is some multiple of the number of clients.
    const rho = await parallel(serverLocations, async () => {
      const tauStr = await askQuestion("Pick a number from 1 to tau:");
      return parseInt(tauStr);
    });

    // Salt value
    const psi = await parallel(serverLocations, async () =>
      Math.floor(Math.random() * (maxSalt - minSalt + 1)) + minSalt
    );

    // 2) Each server computes and publishes the hash α = H(ρ, ψ) to serve as a commitment
    const alpha = await parallel(serverLocations, async (_, unwrap) => {
      const rhoValue = unwrap(rho);
      const psiValue = unwrap(psi);
      return hash(rhoValue, psiValue);
    });

    const alpha_ = await fanin(serverLocations, serverLocations, (server) =>
      async ({ multicast }) => multicast(server, serverLocations, alpha)
    );

    // 3) Every server opens their commitments by publishing their ψ and ρ to each other
    const psi_ = await fanin(serverLocations, serverLocations, (server) =>
      async ({ multicast }) => multicast(server, serverLocations, psi)
    );

    const rho_ = await fanin(serverLocations, serverLocations, (server) =>
      async ({ multicast }) => multicast(server, serverLocations, rho)
    );

    // 4) All servers verify each other's commitment by checking α = H(ρ, ψ)
    await parallel(serverLocations, async (server, unwrap) => {
      if (unwrap(alpha_)[server] != hash(unwrap(rho_)[server], unwrap(psi_)[server])) {
        throw new Error("Commitment failed");
      }
    });

    // 5) If all the checks are successful, then sum random values to get the random index.
    const omega = await parallel(serverLocations, async (_, unwrap) => {
      const randomValues = Object.values(unwrap(rho_)) as [FiniteField];
      return randomValues.reduce((a, b) => field.add(a, b), field.zero) % clientLocations.length;
    });

    const chosenShares = await parallel(serverLocations, async (_, unwrap) =>
      Object.values(unwrap(serverShares))[unwrap(omega)] as FiniteField
    );

    // Server sends the chosen shares to the analyst
    const allShares = await fanin(serverLocations, ["analyst"], (server) =>
      async ({ locally, comm }) => {
        const chosenShares_ = await locally(server, (unwrap) => unwrap(chosenShares));
        return comm(server, "analyst", chosenShares_);
      });

    return await locally("analyst", (unwrap) =>
      Object.values(unwrap(allShares) as Record<string, FiniteField>)
        .reduce((a, b) => field.add(a, b), field.zero));
  };

async function main() {
  // Available roles to choose from
  const roles = ["server1", "server2", "client1", "client2", "analyst"];

  rl.question(`Choose a role (1-5):\n  1) server1\n  2) server2\n  3) client1\n  4) client2\n  5) analyst\nEnter the number: `, async (roleNumber) => {
    const index = parseInt(roleNumber, 10) - 1;

    if (index < 0 || index >= roles.length) {
      console.log("Invalid choice. Please enter a number between 1 and 5.");
      rl.close();
      return;
    }

    const chosenRole = roles[index];
    if (chosenRole === undefined) {
      console.log("Invalid choice. Please enter a number between 1 and 5.");
      rl.close();
      return;
    }


    type Locations = "server1" | "server2" | "client1" | "client2" | "analyst";
    const config: HttpConfig<Locations> = {
      server1: ["localhost", 3000],
      server2: ["localhost", 3001],
      client1: ["localhost", 3002],
      client2: ["localhost", 3003],
      analyst: ["localhost", 3004],
    };

    // Create transport for the chosen role
    const transport = await ExpressTransport.create(config, chosenRole as Locations);
    const projector = new Projector(transport, chosenRole as Locations);

    // Instantiate the choreography with the chosen role
    const lotteryChoreography = lottery(
      ["server1", "server2"], // Servers involved in the choreography
      ["client1", "client2"],  // Clients involved in the choreography
      askQuestion
    );

    const answer = await projector.epp(lotteryChoreography)(void 0);
    if (chosenRole === "analyst") {
      console.log("The chosen number is: ", await projector.unwrap(answer));
    }
    console.log("done");

    // Tear down the transport after use
    await transport.teardown();

    rl.close();
  });
}

if (esMain(import.meta)) {
  main();
}
