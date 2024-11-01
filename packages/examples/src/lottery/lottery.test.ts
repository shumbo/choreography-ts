import { describe, beforeAll, afterAll, expect, it } from "vitest";
import getPort from "get-port";

import {
  ExpressTransport,
  HttpConfig,
} from "@choreography-ts/transport-express";
import { Projector } from "@choreography-ts/core";

import { lottery } from "./lottery";

const servers = ["server1" as const, "server2" as const];
const clients = ["client1" as const, "client2" as const];
const analyst = "analyst" as const



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
    
    // TODO randomize this
    const client1Secret = 42;
    const client2Secret = 84;
    const server1Secret = 3;
    const server2Secret = 5;

    const asAnswer = (num: number) => () => Promise.resolve(num.toString())
    const [,,,,analystAnswer] = await Promise.all([
      client1Projector.epp(lottery(servers, clients, asAnswer(client1Secret)))(undefined),
      client2Projector.epp(lottery(servers, clients, asAnswer(client2Secret)))(undefined),
      server1Projector.epp(lottery(servers, clients, asAnswer(server1Secret)))(undefined),
      server2Projector.epp(lottery(servers, clients, asAnswer(server2Secret)))(undefined),
      analystProjector.epp(lottery(servers, clients, () => Promise.resolve("")))(undefined),
    ]);

    let i = (server1Secret + server2Secret) % servers.length;
    let expectedAnswer = [client1Secret, client2Secret][i]

    expect(analystProjector.unwrap(analystAnswer)).toBe(expectedAnswer?.toString());
  });
});
