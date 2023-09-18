import type { Server as HttpServer } from "node:http";

import { io, Socket } from "socket.io-client";
import { Server } from "socket.io";

import {
  Location,
  Parcel,
  Subscription,
  Transport,
  parcelFromJSON,
} from "@choreography-ts/core";

const SEND_EV = "__SOCKETIO_SEND__";
const RECV_EV = "__SOCKETIO_RECV__";

function createRoomId(prefix: string, location: string) {
  return `${prefix}/${location}`;
}

export function setupServer(httpServer: HttpServer) {
  const io = new Server(httpServer);
  io.on("connection", (socket) => {
    const prefix = socket.handshake.query["prefix"] as string;
    const whoami = socket.handshake.query["whoami"] as string;
    socket.join(createRoomId(prefix, whoami));
    socket.on(SEND_EV, (prefix, target, json, cb) => {
      socket.to(createRoomId(prefix, target)).emit(RECV_EV, json);
      cb();
    });
  });
}

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
