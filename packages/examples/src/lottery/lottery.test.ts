import { describe, beforeAll, afterAll, expect, it } from "vitest";
import getPort from "get-port";

import {
  ExpressTransport,
  HttpConfig,
} from "@choreography-ts/transport-express";
import { Projector } from "@choreography-ts/core";

import { lottery } from "./lottery";


const servers = ["server1", "server2"]
const clients = ["client1", "client2"]
const analyst = "analyst"


let server1Projector: Projector<"server1" | "server2" | "client1" | "client2" | "analyst", "server1">;
let server2Projector: Projector<"server1" | "server2" | "client1" | "client2" | "analyst", "server2">;
let client1Projector: Projector<"server1" | "server2" | "client1" | "client2" | "analyst", "client1">;
let client2Projector: Projector<"server1" | "server2" | "client1" | "client2" | "analyst", "client2">;
let analystProjector: Projector<"server1" | "server2" | "client1" | "client2" | "analyst", "analyst">;

const config: HttpConfig<"server1" | "server2" | "client1" | "client2" | "analyst"> = {
  server1: ["127.0.0.1", await getPort()],
  server2: ["127.0.0.1", await getPort()],
  client1: ["127.0.0.1", await getPort()],
  client2: ["127.0.0.1", await getPort()],
  analyst: ["127.0.0.1", await getPort()],
};



describe("lottery", () => {
  beforeAll(async () => {
    const server1Transport = await ExpressTransport.create(config, "server1");
    const server2Transport = await ExpressTransport.create(config, "server2");
    const client1Transport = await ExpressTransport.create(config, "client1");
    const client2Transport = await ExpressTransport.create(config, "client2");
    const analystTransport = await ExpressTransport.create(config, "analyst");

    server1Projector = new Projector(server1Transport, "server1");
    server2Projector = new Projector(server2Transport, "server2");
    client1Projector = new Projector(client1Transport, "client1");
    client2Projector = new Projector(client2Transport, "client2");
    analystProjector = new Projector(analystTransport, "analyst");
  });
  afterAll(async () => {
    await Promise.all([
        server1Projector.transport.teardown(),
        server2Projector.transport.teardown(),
        client1Projector.transport.teardown(),
        client2Projector.transport.teardown(),
        analystProjector.transport.teardown(),
    ]);
  });
  it("Test lottery", async () => {
    const k = await Promise.all([
      client1Projector.epp(lottery(servers, client)),
      client2Projector.epp(lottery(servers, clients)),
      server1Projector.epp(lottery(servers, clients)),
      server2Projector.epp(lottery(servers, clients)),
      analystProjector.epp(lottery(servers, clients)),
    ]);
    expect(true).toBeTruthy();
  });
});
