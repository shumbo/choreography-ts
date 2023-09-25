import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { RECV_EV, SEND_EV, createRoomId } from "./shared.js";

export function setupServer(httpServer: HttpServer) {
  const io = new Server(httpServer, { cors: { origin: "*" } });
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
