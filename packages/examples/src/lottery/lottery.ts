import { Choreography, Located, Projector } from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

// At least 2 servers and 2 clients
// TODO How can I have arbitrary number of servers >=2
// I made a few attempts going to keep them commented in case you all have any opinions

/** Attempt 1
const serverLocations_ = ["server1", "server2" ] as const;
type ServerLocations_ = (typeof serverLocations_);
type ServerLocations<serverTail extends [number]> = [...ServerLocations_, ...serverTail][number];

type AtLeastTwo = [string, string, ...string[]];

const clientLocations_ = [] as const;
type ClientLocations_ = (typeof clientLocations_)[number];

// There is only 1 analyst location
const analystLocation_ = "analyst" as const;
const AnalystLocation_ = typeof analystLocation_;

const locations_ (serverLocations_ : string[]) => [analystLocation_, ...clientLocations_, ...serverLocations_] as const;
type Locations_ = (typeof locations)[number];

const locations = ["server1", "server2", "seller"] as const;
export type Locations = (typeof locations)[number];
*/

// There is only 1 analyst location
const analystLocation_ = "analyst" as const;
type AnalystLocation_ = typeof analystLocation_;

type FiniteField = number // TODO use some finite field library

// Perhaps I can pass it in as an argument?
export const lottery: (
  serverLocations : ["server1", "server2", ...string[]], // Not sure if we really want ...string[]. I think we want to take a type param that we can union?
  clientLocations : ["server1", "server2", ...string[]],
) => Choreography<
  ([... typeof serverLocations, ... typeof clientLocations, AnalystLocation_])[number],
  [], // We don't have an argument in the original. The clients do generate a secret so that could be an argument.
  [Located<FiniteField, "analyst">]
> = (serverLocations, clientLocations) => {
  const c: Choreography<
  ([... typeof serverLocations, ... typeof clientLocations, AnalystLocation_])[number],
  [],
  [Located<FiniteField, "analyst">]> = async ({ locally, comm, multicast, colocally, call }, []) => {
    // TODO implement
    return 1;
  }
  // Do we need to do this
  return c;
}
