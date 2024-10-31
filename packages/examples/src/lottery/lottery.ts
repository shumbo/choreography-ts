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

// https://stackoverflow.com/questions/18193953/waiting-for-user-to-enter-input-in-node-js
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

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
  type Locations = "server1" | "server2" | "client1" | "client2" | "analyst";
  const config: HttpConfig<Locations> = {
    server1: ["localhost", 3000],
    server2: ["localhost", 3001],
    client1: ["localhost", 3002],
    client2: ["localhost", 3003],
    analyst: ["localhost", 3004],
  };
  const [
    server1Transport,
    server2Transport,
    client1Transport,
    client2Transport,
    analystTransport,
  ] = await Promise.all([
    ExpressTransport.create(config, "server1"),
    ExpressTransport.create(config, "server2"),
    ExpressTransport.create(config, "client1"),
    ExpressTransport.create(config, "client2"),
    ExpressTransport.create(config, "analyst"),
  ]);
  const server1Projector = new Projector(server1Transport, "server1");
  const server2Projector = new Projector(server2Transport, "server2");
  const client1Projector = new Projector(client1Transport, "client1");
  const client2Projector = new Projector(client2Transport, "client2");
  const analystProjector = new Projector(analystTransport, "analyst");

  // instantiate the choreography with concrete locations
  const lotteryChoreography = lottery(
    ["server1", "server2"],
    ["client1", "client2"]
  );
  await Promise.all([
    server1Projector.epp(lotteryChoreography)(void 0),
    server2Projector.epp(lotteryChoreography)(void 0),
    client1Projector.epp(lotteryChoreography)(void 0),
    client2Projector.epp(lotteryChoreography)(void 0),
    analystProjector.epp(lotteryChoreography)(void 0),
  ]);
  console.log("done");
  await Promise.all([
    server1Transport.teardown(),
    server2Transport.teardown(),
    client1Transport.teardown(),
    client2Transport.teardown(),
    analystTransport.teardown(),
  ]);
}

if (esMain(import.meta)) {
  main();
}
