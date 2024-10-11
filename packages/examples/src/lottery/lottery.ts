import { Choreography, Located, Projector, Location, Faceted} from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

type FiniteField = number // TODO use some finite field library

const randomFp = () => Math.random();

const hash = (rho : number, psi : number) => 42; // TODO implement

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

      const secret = await parallel(clientLocations, async (unwrap) => {
        return randomFp();
      })

      const clientShares = await parallel(clientLocations, async (_ , unwrap) => {
        const freeShares = Array.from({ length: serverLocations.length }, () => randomFp());
        var serverToShares: any = {}
        serverLocations.forEach((server, i) => {
          serverToShares[server] = unwrap(secret) - freeShares.reduce((a, b) => a + b, 0);
        });
        return serverToShares as Record<SL, FiniteField>;
      })

      // Weird that Q extends is needed here
      const serverShares : Faceted<[FiniteField], SL> = await fanout(serverLocations, <Server extends SL>(server : Server) => {
        const c : Choreography<SL | CL | "analyst", [], [Located<[FiniteField], Server>]> = async ({ locally, fanin }) => {
          // Temporary code to make it compile might not be the type we want
          // const temp = undefined as any as Located<[FiniteField], Server>
          // return [temp]
          const temp : Located<[FiniteField], Server> = await fanin(clientLocations, serverLocations, async (client) => {
              const serverShare: Located<FiniteField, Server> = await locally(client, (unwrap) => {
                let clientShare = unwrap(clientShares);
                return clientShare[server];
              })
              return comm(client, server, serverShare)
            })
          return [temp]
        }
        return c
        })

      // 1) Each server selects a random number; τ is some multiple of the number of clients.
      const rho = await parallel(serverLocations, async(server, unwrap) => {
        console.log("Pick a number from 1 to tau:")
        // TODO get input from user
        return 42
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

      const rho_ = await fanin(serverLocations, serverLocations, (server) =>
        async ({ comm }) => {
          return comm(server, serverLocations, rho)
      })

      // 4) All servers verify each other's commitment by checking α = H(ρ, ψ)

      await parallel(serverLocations, async (server, unwrap) => {
        if (alpha_ != hash(rho_, psi_)) {
          throw new Error("Commitment failed")
        }
      })

      // 5) If all the checks are successful, then sum random values to get the random index.
      const omega = await parallel(serverLocations, async (server, unwrap) => {
        return rho_.reduce((a, b) => a + b, 0) % clientLocations.length
      })

      const chosenShares = await parallel(serverLocations, async (server, unwrap) => {
        return serverShares[omega]
      })

      // Server sends the chosen shares to the analyst
      const allShares = fanin(serverLocations, ["analyst"], (server) => {
        async ({ comm }) => {
          return comm(server, "analyst", chosenShares)
      })

      await locally("analyst", (unwrap) => {
        console.log(`The answer is: ${allShares.reduce((a, b) => a + b, 0)}`)
      })
      
    return undefined;
  }
  return c;
}
