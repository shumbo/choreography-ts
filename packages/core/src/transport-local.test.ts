import { TransportTestSuite } from "./lib/transport-test-suite";
import { LocalTransport } from "./transport-local";

const localTransportFactory: TransportTestSuite.TransportFactory = async () => {
  const channel = LocalTransport.createChannel(TransportTestSuite.locations);
  const transports = [
    new LocalTransport<TransportTestSuite.Locations, "alice">(
      TransportTestSuite.locations,
      "alice",
      channel
    ),
    new LocalTransport<TransportTestSuite.Locations, "bob">(
      TransportTestSuite.locations,
      "bob",
      channel
    ),
    new LocalTransport<TransportTestSuite.Locations, "carol">(
      TransportTestSuite.locations,
      "carol",
      channel
    ),
    new LocalTransport<TransportTestSuite.Locations, "dave">(
      TransportTestSuite.locations,
      "dave",
      channel
    ),
  ] as const;
  return {
    transports,
    teardown: async () => {
      await Promise.all(transports.map((t) => t.teardown()));
      channel.emitter.all.clear();
    },
  };
};

describe("LocalTransport", () => {
  TransportTestSuite.transportTestSuite(localTransportFactory);
});
