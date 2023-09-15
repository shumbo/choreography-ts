import { TransportTestSuite } from "@choreography-ts/core";
import { ExpressTransport, HttpConfig } from "./transport-express";
const expressTransportFactory: TransportTestSuite.TransportFactory =
  async () => {
    const config: HttpConfig<TransportTestSuite.Locations> = {
      alice: ["127.0.0.1", 3020],
      bob: ["127.0.0.1", 3021],
      carol: ["127.0.0.1", 3022],
      dave: ["127.0.0.1", 3023],
    };
    const transports = [
      await ExpressTransport.create(config, "alice"),
      await ExpressTransport.create(config, "bob"),
      await ExpressTransport.create(config, "carol"),
      await ExpressTransport.create(config, "dave"),
    ] as const;
    return {
      transports,
      teardown: async () => {
        await Promise.all(transports.map((t) => t.teardown()));
      },
    };
  };

describe("ExpressTransport", () => {
  TransportTestSuite.transportTestSuite(expressTransportFactory);
});
