import { describe, afterAll, expect, test, beforeAll } from "vitest";
import getPort from "get-port";
import { createServer } from "node:http";

import { TransportTestSuite } from "@choreography-ts/core";
import {
  SocketIOConfig,
  SocketIOTransport,
  setupServer,
} from "./transport-socketio";

const port = await getPort();

const socketIOTransportFactory: TransportTestSuite.TransportFactory =
  async () => {
    const server = createServer();
    setupServer(server);
    server.listen(port);
    const config: SocketIOConfig<TransportTestSuite.Locations> = {
      uri: `http://localhost:${port}`,
      prefix: "choreography",
      locations: ["alice", "bob", "carol", "dave"],
    };
    const transports = [
      await SocketIOTransport.create(config, "alice"),
      await SocketIOTransport.create(config, "bob"),
      await SocketIOTransport.create(config, "carol"),
      await SocketIOTransport.create(config, "dave"),
    ] as const;
    return {
      transports,
      teardown: async () => {
        await Promise.all(transports.map((t) => t.teardown()));
        server.close();
      },
    };
  };

describe("SocketIOTransport", () => {
  TransportTestSuite.transportTestSuite(socketIOTransportFactory, {
    beforeAll,
    afterAll,
    expect,
    test,
  });
});
