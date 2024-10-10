import { Choreography, Located, Projector, Location, Faceted} from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

type FiniteField = number // TODO use some finite field library

const randomFp = () => Math.random();

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
        var serverToShares : any = {} // - Record<SL, FiniteField> = {};
        serverLocations.forEach((server, i) => {
          serverToShares[server] = unwrap(secret) - freeShares.reduce((a, b) => a + b, 0);
        });
        return serverToShares;
      })

      // Weird that Q extends is needed here
      const serverShares : Faceted<[FiniteField], SL> = await fanout(serverLocations, <Server extends SL>(server : Server) => {
        const c : Choreography<SL | CL | "analyst", [], [Located<[FiniteField], Server>]> = async ({ locally, fanin }) => {
          // Temporary code to make it compile might not be the type we want
          // const temp = undefined as any as Located<[FiniteField], Server>
          // return [temp]
          const temp : Located<[FiniteField], Server> = await fanin(clientLocations, serverLocations, async (client) => {
              const c2 : Located<FiniteField, Server> = await locally(client, (unwrap) => {
                let clientShare = unwrap(clientShares);
                return clientShare[server];
              })
              return c2
            })
          return [temp]
        }
        return c
        })
    return 1;
  }
  return c;
}
