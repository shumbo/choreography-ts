import { describe, beforeAll, afterAll, expect, it } from "vitest";
import getPort from "get-port";

import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";
import { Locations, bookseller, oneBuyer, twoBuyers } from "./bookseller2";
import { Projector } from "@choreography-ts/core";

const config: HttpConfig<Locations> = {
  seller: ["127.0.0.1", await getPort()],
  buyer1: ["127.0.0.1", await getPort()],
  buyer2: ["127.0.0.1", await getPort()],
};

let buyer1Projector: Projector<Locations, "buyer1">;
let buyer2Projector: Projector<Locations, "buyer2">;
let sellerProjector: Projector<Locations, "seller">;

describe("bookseller2", () => {
  beforeAll(async () => {
    const [buyer1Transport, buyer2Transport, sellerTransport] =
      await Promise.all([
        ExpressTransport.create(config, "buyer1"),
        ExpressTransport.create(config, "buyer2"),
        ExpressTransport.create(config, "seller"),
      ]);
    buyer1Projector = new Projector(buyer1Transport, "buyer1");
    buyer2Projector = new Projector(buyer2Transport, "buyer2");
    sellerProjector = new Projector(sellerTransport, "seller");
  });
  afterAll(async () => {
    await Promise.all([
      buyer1Projector.transport.teardown(),
      buyer2Projector.transport.teardown(),
      sellerProjector.transport.teardown(),
    ]);
  });
  it("cannot buy HoTT with one buyer", async () => {
    const choreography = bookseller(oneBuyer);
    const [[dateForHoTT]] = await Promise.all([
      buyer1Projector.epp(choreography)(["HoTT"]),
      buyer2Projector.epp(choreography)([undefined]),
      sellerProjector.epp(choreography)([undefined]),
    ]);
    expect(dateForHoTT).toBeFalsy();
  });
  it("can buy HoTT with two buyers", async () => {
    const choreography = bookseller(twoBuyers);
    const [[dateForHoTT]] = await Promise.all([
      buyer1Projector.epp(choreography)(["HoTT"]),
      buyer2Projector.epp(choreography)([undefined]),
      sellerProjector.epp(choreography)([undefined]),
    ]);
    expect(dateForHoTT).toBeTruthy();
  });
});
