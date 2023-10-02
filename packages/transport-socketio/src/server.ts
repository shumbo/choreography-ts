import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { RECV_EV, SEND_EV, createRoomId } from "./shared.js";
import { Queue, DefaultDict } from "@choreography-ts/core";

type Msg = string;

export function setupServer(httpServer: HttpServer) {
  const io = new Server(httpServer, { cors: { origin: "*" } });

  // When a client is not connected to a room, the messages are buffered here.
  const room_to_queue = new DefaultDict<string, Queue<Msg>>(() => new Queue());

  io.on("connection", (socket) => {
    let onDisconnect: () => void;
    const disconnectSignal = new Promise<void>((resolve) => {
      onDisconnect = resolve;
    });

    const prefix = socket.handshake.query["prefix"] as string;
    const whoami = socket.handshake.query["whoami"] as string;

    socket.join(createRoomId(prefix, whoami));
    socket.on(SEND_EV, (prefix, target, json, cb) => {
      // Upon receiving a message, we push it to the queue of the target room.
      room_to_queue.get(createRoomId(prefix, target)).push(json);
      cb();
    });

    socket.on("disconnect", () => {
      onDisconnect();
    });
    socket.on("error", () => {
      onDisconnect();
    });

    // We run this loop concurrently and process messages as they arrive.
    (async () => {
      for (;;) {
        const msg = await Promise.race([
          room_to_queue.get(createRoomId(prefix, whoami)).pop(),
          disconnectSignal,
        ]);
        if (msg === undefined) {
          break;
        }
        socket.emit(RECV_EV, msg);
      }
    })();
  });
}
