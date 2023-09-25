import { io, Socket } from "socket.io-client";

import {
  Location,
  Parcel,
  Subscription,
  Transport,
  parcelFromJSON,
} from "@choreography-ts/core";
import { SEND_EV, RECV_EV } from "./shared.js";

export type SocketIOConfig<L extends Location> = {
  uri: string;
  prefix: string;
  locations: L[];
};

export class SocketIOTransport<L extends Location, L1 extends L>
  implements Transport<L, L1>
{
  public static async create<L extends Location, L1 extends L>(
    config: SocketIOConfig<L>,
    target: L1
  ) {
    const socket = io(config.uri, {
      query: { prefix: config.prefix, whoami: target },
    });
    return new SocketIOTransport<L, L1>(
      socket,
      config.prefix,
      config.locations,
      target
    );
  }
  private constructor(
    private socket: Socket,
    private prefix: string,
    private locs: L[],
    private target: L1
  ) {}

  get locations(): readonly L[] {
    return this.locs;
  }
  async teardown(): Promise<void> {
    this.socket.disconnect();
  }
  send(parcel: Parcel<L>): Promise<void> {
    return new Promise((resolve) => {
      this.socket.emit(
        SEND_EV,
        this.prefix,
        parcel.to,
        JSON.stringify(parcel),
        () => {
          resolve();
        }
      );
    });
  }
  subscribe(cb: (p: Parcel<L>) => void): Subscription {
    this.socket.on(RECV_EV, (json: string) => {
      const parcel: Parcel<L> = parcelFromJSON(json);
      cb(parcel);
    });
    return {
      remove: () => {
        this.socket.off(RECV_EV);
      },
    };
  }
}
