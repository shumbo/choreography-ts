import {
  Location,
  Parcel,
  Subscription,
  Transport,
} from "@choreography-ts/core";
import { Peer, DataConnection } from "peerjs";

export type PeerJsConfig<L extends Location> = Record<L, DataConnection>;

export class PeerJSTransport<
  L extends Location,
  L1 extends L,
> extends Transport<L, L1> {
  constructor(
    private config: PeerJsConfig<L>,
    private peer: Peer,
  ) {
    super();
  }
  get locations(): readonly L[] {
    return Object.keys(this.config) as L[];
  }
  async teardown(): Promise<void> {
    this.peer.destroy();
  }
  async send(parcel: Parcel<L>): Promise<void> {
    this.config[parcel.to].send(JSON.stringify(parcel));
  }
  subscribe(cb: (p: Parcel<L>) => void): Subscription {
    const parseAndCall = (data: unknown) => {
      const parcel = JSON.parse(data as string) as Parcel<L>;
      cb(parcel);
    };
    for (const location in this.config) {
      this.config[location].on("data", parseAndCall);
    }
    return {
      remove: () => {
        for (const location in this.config) {
          this.config[location].off("data", parseAndCall);
        }
      },
    };
  }
}
