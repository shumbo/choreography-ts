import {
  Choreography,
  Projector,
  Location,
  Faceted,
  MultiplyLocated,
} from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";
import readline from "readline";

type FiniteField = number; // TODO use some finite field library

const randomFp = () => Math.random();

const hash = (rho: number, psi: number) => 42; // TODO implement

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

// Perhaps I can pass it in as an argument?
// TODO also test this. Possibly new combinators (fanIn, fanOut, parallel) might have a bug
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
  > = async ({
    locally,
    comm,
    multicast,
    enclave,
    call,
    fanin,
    fanout,
    parallel,
  }) => {
    const secret = await parallel(clientLocations, async () => {
      const secretStr = await askQuestion("Secret: ");
      return parseInt(secretStr);
    });

    const clientShares = await parallel(clientLocations, async (_, unwrap) => {
      const freeShares = Array.from({ length: serverLocations.length }, () =>
        randomFp()
      );
      const serverToShares: Record<string, number> = {};
      serverLocations.forEach((server, i) => {
        serverToShares[server] =
          unwrap(secret) - freeShares.reduce((a, b) => a + b, 0);
      });
      return serverToShares as Record<SL, FiniteField>;
    });

    const serverShares = await fanout(
      serverLocations,
      (server) =>
        async ({ fanin }) => {
          const shares = await fanin(
            clientLocations,
            [server],
            <C extends CL>(client: C) =>
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
      if (unwrap(alpha_) != hash(unwrap(rho_)[server], unwrap(psi_)[server])) {
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
