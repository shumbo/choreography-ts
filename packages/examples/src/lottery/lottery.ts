import { Choreography, Located, Projector, Location, Faceted} from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";
import readline from 'readline';

type FiniteField = number // TODO use some finite field library

const randomFp = () => Math.random();

const hash = (rho : number, psi : number) => 42; // TODO implement

// https://stackoverflow.com/questions/18193953/waiting-for-user-to-enter-input-in-node-js
function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}


// Perhaps I can pass it in as an argument?
// TODO also test this. Possibly new combinators (fanIn, fanOut, parallel) might have a bug
export const lottery = <SL extends Location, CL extends Location>(
  serverLocations : SL[],
  clientLocations : CL[]
) : Choreography<
  "analyst" | SL | CL,
  [],
  [Located<FiniteField, "analyst">]
> => {
  const c: Choreography<
  "analyst" | SL | CL,
  [Located<FiniteField, "analyst">]> = async ({ locally, comm, multicast, enclave, call, fanin, fanout, parallel }, []) => {

      const secret = await parallel(clientLocations, async () => {
        const secretStr = await askQuestion("Secret: ")
        return parseInt(secretStr)
      })

      const clientShares = await parallel(clientLocations, async (_ , unwrap) => {
        const freeShares = Array.from({ length: serverLocations.length }, () => randomFp());
        var serverToShares: any = {}
        serverLocations.forEach((server, i) => {
          serverToShares[server] = unwrap(secret) - freeShares.reduce((a, b) => a + b, 0);
        });
        return serverToShares as Record<SL, FiniteField>;
      })

      const serverShares : Faceted<{[client in CL]: FiniteField}, SL> = await fanout(serverLocations, <Server extends SL>(server : Server) => 
        async ({ locally, fanin }) =>
          [await fanin(clientLocations, [server], (client) => 
              (async ({ locally, fanin }) => {
                const serverShare: Located<FiniteField, typeof client> = await locally(client, (unwrap) => {
                  let clientShare = unwrap(clientShares);
                  return clientShare[server];
                })
                return [await comm(client, server, serverShare)]
            })
            )]
        )

      // 1) Each server selects a random number; τ is some multiple of the number of clients.
      const rho = await parallel(serverLocations, async () => {
        const tauStr = await askQuestion("Pick a number from 1 to tau:")
        return parseInt(tauStr)
      })

      // Salt value
      const psi = await parallel(serverLocations, async(server, unwrap) => {
        const max = 2^18
        const min = 2^20
        return Math.floor(Math.random() * (max - min + 1)) + min;
      })

      // 2) Each server computes and publishes the hash α = H(ρ, ψ) to serve as a commitment
      const alpha = await parallel(serverLocations, async(server, unwrap) => {
        const rhoValue = unwrap(rho)
        const psiValue = unwrap(psi)
        return hash(rhoValue, psiValue)
      })

      const alpha_ = await fanin(serverLocations, serverLocations, (server) =>
        async ({ comm }) => {
          return comm(server, serverLocations, alpha)
        }
      )

      // 3) Every server opens their commitments by publishing their ψ and ρ to each other
      const psi_ = await fanin(serverLocations, serverLocations, (server) =>
        async ({ comm }) => {
          return comm(server, serverLocations, psi)
      })

      const rho_ : Located<{ [key in SL]: FiniteField }, SL> = await fanin(serverLocations, serverLocations, (server) =>
        async ({ comm }) => {
          return comm(server, serverLocations, rho)
      })

      // 4) All servers verify each other's commitment by checking α = H(ρ, ψ)

      await parallel(serverLocations, async (server, unwrap) => {
        if (unwrap(alpha_) != hash(rho_, psi_)) {
          throw new Error("Commitment failed")
        }
      })

      // 5) If all the checks are successful, then sum random values to get the random index.
      const omega = await parallel(serverLocations, async (server, unwrap) => {
        const temp = unwrap(rho_)
        const temp2 = Object.values(temp) as [FiniteField]
        return temp2.reduce((a, b) => a + b, 0) % clientLocations.length
      })

      const chosenShares = await parallel(serverLocations, async (server, unwrap) => 
         Object.values(unwrap(serverShares))[unwrap(omega)]
      )

      // Server sends the chosen shares to the analyst
      const allShares = fanin(serverLocations, ["analyst"], (server) => {
        async ({ comm }) => {
          return comm(server, "analyst", chosenShares)
        }
      })

      await locally("analyst", (unwrap) => {
        console.log(`The answer is: ${Object.values(unwrap(allShares)).reduce((a, b) => a + b, 0)}`)
      })
      
    return undefined;
  }
  return c;
}
