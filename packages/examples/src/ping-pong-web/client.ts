/// <reference lib="DOM" />

import { SocketIOTransport } from "@choreography-ts/transport-socketio";
import { Choreography, Projector } from "@choreography-ts/core";

type L = "Alice" | "Bob";

const pingPongChoreography: Choreography<L, [], []> = async ({
  locally,
  comm,
}) => {
  const m = await locally("Alice", () => "KEYWORD");
  console.log("before comm");
  const n2 = await comm("Alice", "Bob", m);
  console.log("after comm", { n2 });
  return [];
};

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    const room = prompt("Room name?") ?? "default";
    let roleInput: string | null = null;
    while (roleInput !== "Alice" && roleInput !== "Bob") {
      roleInput = prompt("Role? (Alice or Bob)") ?? "Alice";
    }
    const role = roleInput;
    const transport = await SocketIOTransport.create(
      {
        uri: "http://127.0.0.1:3400",
        prefix: room,
        locations: ["Alice", "Bob"],
      },
      role,
    );
    const projector = new Projector(transport, role);
    await projector.epp(pingPongChoreography)([]);
    console.log("done");
  })().catch((e) => {
    console.error(e);
  });
});
