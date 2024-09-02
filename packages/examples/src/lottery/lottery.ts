import { Choreography, Located, Projector, Location} from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

type FiniteField = number // TODO use some finite field library

const randomFp = () => Math.random();

// Perhaps I can pass it in as an argument?
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
  [Located<FiniteField, "analyst">]> = async ({ locally, comm, multicast, colocally, call }, []) => {

      const secret = await locally(clientLocations, (unwrap) => {
        return randomFp();
      }

      // TODO What's the analogue of parallel in choreography-ts?
      const clientShares = await colocally(clientLocations, (unwrap) => {
        const freeShares = Array.from({ length: n }, () => randomFp());
        var serverToShares: Record<SL, FiniteField> = {};
        serverLocations.forEach((server, i) => {
          serverToShares[server] = unwrap(secret) - sum(freeShares);
        });
        return serverToShares;
      })
    // TODO implement
    return 1;
  }
  // Do we need to do this
  return c;
}
