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

type FiniteField = number; // TODO use some finite field library

const randomFp = () => Math.random();

const hash = (rho: number, psi: number) => createHash('sha256').update((rho + psi).toString()).digest('hex')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// https://stackoverflow.com/questions/18193953/waiting-for-user-to-enter-input-in-node-js
function askQuestion(query: string): Promise<string> {

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

export const lottery = <SL extends Location, CL extends Location>(
  serverLocations: SL[],
  clientLocations: CL[]
): Choreography<
  "analyst" | SL | CL,
  undefined,
  MultiplyLocated<FiniteField, "analyst">
> => {
  const c: Choreography<
    "analyst" | SL | CL,
    undefined,
    MultiplyLocated<FiniteField, "analyst">
  > = async ({ locally, fanin, fanout, parallel }) => {
    const secret = await parallel(clientLocations, async () => {
      const secretStr = await askQuestion("Secret: ");
      return parseInt(secretStr);
    });

    const clientShares = await parallel(clientLocations, async (_, unwrap) => {
      const freeShares = Array.from({ length: serverLocations.length }, () =>
        randomFp()
      );
      const serverToShares: Record<string, number> = {};
      for (const server of serverLocations) {
        serverToShares[server] =
          unwrap(secret) - freeShares.reduce((a, b) => a + b, 0);
      }
      return serverToShares as Record<SL, FiniteField>;
    });

    const serverShares = await fanout(
      serverLocations,
      (server) =>
        async ({ fanin }) => {
          const shares = await fanin(
            clientLocations,
            [server],
            (client) =>
              async ({ locally, comm }) => {
                const share = await locally(client, (unwrap) => {
                  const dict = unwrap(clientShares);
                  const x = dict[server] as number;
                  return x;
                });
                const share_ = await comm(client, server, share);
                return share_;
              }
          );
          return shares;
        }
    );

    // 1) Each server selects a random number; τ is some multiple of the number of clients.
    const rho = await parallel(serverLocations, async () => {
      const tauStr = await askQuestion("Pick a number from 1 to tau:");
      return parseInt(tauStr);
    });

    // Salt value
    const psi = await parallel(serverLocations, async () => {
      const max = 2 ^ 18;
      const min = 2 ^ 20;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    });

    // 2) Each server computes and publishes the hash α = H(ρ, ψ) to serve as a commitment
    const alpha = await parallel(serverLocations, async (server, unwrap) => {
      const rhoValue = unwrap(rho);
      const psiValue = unwrap(psi);
      return hash(rhoValue, psiValue);
    });

    const alpha_ = await fanin(
      serverLocations,
      serverLocations,
      (server) =>
        async ({ multicast }) => {
          return await multicast(server, serverLocations, alpha);
        }
    );

    // 3) Every server opens their commitments by publishing their ψ and ρ to each other
    const psi_ = await fanin(
      serverLocations,
      serverLocations,
      (server) =>
        async ({ multicast }) => {
          return multicast(server, serverLocations, psi);
        }
    );

    const rho_: MultiplyLocated<{ [key in SL]: FiniteField }, SL> = await fanin(
      serverLocations,
      serverLocations,
      (server) =>
        async ({ multicast }) => {
          return multicast(server, serverLocations, rho);
        }
    );

    // 4) All servers verify each other's commitment by checking α = H(ρ, ψ)

    await parallel(serverLocations, async (server, unwrap) => {
      if (
        unwrap(alpha_)[server] !=
        hash(unwrap(rho_)[server], unwrap(psi_)[server])
      ) {
        throw new Error("Commitment failed");
      }
    });

    // 5) If all the checks are successful, then sum random values to get the random index.
    const omega = await parallel(serverLocations, async (server, unwrap) => {
      const temp = unwrap(rho_);
      const temp2 = Object.values(temp) as [FiniteField];
      return temp2.reduce((a, b) => a + b, 0) % clientLocations.length;
    });

    const chosenShares = await parallel(
      serverLocations,
      async (server, unwrap) =>
        Object.values(unwrap(serverShares))[unwrap(omega)]
    );

    // Server sends the chosen shares to the analyst
    const allShares = await fanin(
      serverLocations,
      ["analyst"],
      (server) =>
        async ({ locally, comm }) => {
          const c = await locally(server, (unwrap) => {
            return unwrap(chosenShares);
          });
          return comm(server, "analyst", c);
        }
    );

    const ans = await locally("analyst", (unwrap) => {
      const ans = Object.values(
        unwrap(allShares) as Record<string, number>
      ).reduce((a, b) => a + b, 0);
      console.log(`The answer is: ${ans}`);
      return ans;
    });
    return ans;
  };
  return c;
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
    console.log(`You chose: ${chosenRole}`);

    type Locations = "server1" | "server2" | "client1" | "client2" | "analyst";
    const config: HttpConfig<Locations> = {
      server1: ["localhost", 3000],
      server2: ["localhost", 3001],
      client1: ["localhost", 3002],
      client2: ["localhost", 3003],
      analyst: ["localhost", 3004],
    };

    // Create transport for the chosen role
    const transport = await ExpressTransport.create(config, chosenRole);
    const projector = new Projector(transport, chosenRole);

    // Instantiate the choreography with the chosen role
    const lotteryChoreography = lottery(
      ["server1", "server2"], // Servers involved in the choreography
      ["client1", "client2"]  // Clients involved in the choreography
    );

    await projector.epp(lotteryChoreography)(void 0);
    console.log("done");

    // Tear down the transport after use
    await transport.teardown();

    rl.close();
  });
}

if (esMain(import.meta)) {
  main();
}
