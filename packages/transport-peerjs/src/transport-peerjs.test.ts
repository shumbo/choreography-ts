import { PeerServer } from "peer";
import { Peer, DataConnection } from "peerjs";

import { TransportTestSuite } from "@choreography-ts/core";

import { PeerJSTransport } from "./transport-peerjs";

function createPeer(): Promise<Peer> {
  return new Promise((resolve) => {
    const peer = new Peer();
    peer.once("open", () => {
      resolve(peer);
    });
  });
}

function connect(peer: Peer, id: string): Promise<DataConnection> {
  const conn = peer.connect(id);
  return new Promise((resolve) => {
    conn.once("open", () => {
      resolve(conn);
    });
  });
}

const peerJSTransportFactory: TransportTestSuite.TransportFactory =
  async () => {
    const peerServer = PeerServer({ port: 9000 });

    const [ap, bp, cp, dp] = await Promise.all([
      createPeer(),
      createPeer(),
      createPeer(),
      createPeer(),
    ]);

    const at = new PeerJSTransport<TransportTestSuite.Locations, "alice">(
      {
        alice: await connect(ap, ap.id),
        bob: await connect(ap, bp.id),
        carol: await connect(ap, cp.id),
        dave: await connect(ap, dp.id),
      },
      ap
    );
    const bt = new PeerJSTransport<TransportTestSuite.Locations, "bob">(
      {
        alice: await connect(bp, ap.id),
        bob: await connect(bp, bp.id),
        carol: await connect(bp, cp.id),
        dave: await connect(bp, dp.id),
      },
      bp
    );
    const ct = new PeerJSTransport<TransportTestSuite.Locations, "carol">(
      {
        alice: await connect(cp, ap.id),
        bob: await connect(cp, bp.id),
        carol: await connect(cp, cp.id),
        dave: await connect(cp, dp.id),
      },
      cp
    );
    const dt = new PeerJSTransport<TransportTestSuite.Locations, "dave">(
      {
        alice: await connect(dp, ap.id),
        bob: await connect(dp, bp.id),
        carol: await connect(dp, cp.id),
        dave: await connect(dp, dp.id),
      },
      dp
    );
    return {
      transports: [at, bt, ct, dt],
      teardown: async () => {
        await Promise.all([
          at.teardown(),
          bt.teardown(),
          ct.teardown(),
          dt.teardown(),
        ]);
        console.log(peerServer);
      },
    };
  };

describe("PeerJSTransport", () => {
  TransportTestSuite.transportTestSuite(peerJSTransportFactory);
});
