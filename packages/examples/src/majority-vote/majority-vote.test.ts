import { describe, beforeAll, afterAll, expect, it } from "vitest";
import getPort from "get-port";

import {
  ExpressTransport,
  HttpConfig,
} from "@choreography-ts/transport-express";
import { L, majorityVote } from "./majority-vote";
import { Projector } from "@choreography-ts/core";

const config: HttpConfig<L> = {
  judge: ["localhost", await getPort()],
  voter1: ["localhost", await getPort()],
  voter2: ["localhost", await getPort()],
  voter3: ["localhost", await getPort()],
};

let judgeProjector: Projector<L, "judge">;
let voter1Projector: Projector<L, "voter1">;
let voter2Projector: Projector<L, "voter2">;
let voter3Projector: Projector<L, "voter3">;

describe("majorityVote", () => {
  beforeAll(async () => {
    const [judgeTransport, voter1Transport, voter2Transport, voter3Transport] =
      await Promise.all([
        ExpressTransport.create(config, "judge"),
        ExpressTransport.create(config, "voter1"),
        ExpressTransport.create(config, "voter2"),
        ExpressTransport.create(config, "voter3"),
      ]);

    judgeProjector = new Projector(judgeTransport, "judge");
    voter1Projector = new Projector(voter1Transport, "voter1");
    voter2Projector = new Projector(voter2Transport, "voter2");
    voter3Projector = new Projector(voter3Transport, "voter3");
  });
  afterAll(async () => {
    await Promise.all([
      judgeProjector.transport.teardown(),
      voter1Projector.transport.teardown(),
      voter2Projector.transport.teardown(),
      voter3Projector.transport.teardown(),
    ]);
  });
  it("test", async () => {
    const judge = judgeProjector.epp(majorityVote);
    const voter1 = voter1Projector.epp(majorityVote);
    const voter2 = voter2Projector.epp(majorityVote);
    const voter3 = voter3Projector.epp(majorityVote);

    const [[isMajority]] = await Promise.all([
      judge([]),
      voter1([]),
      voter2([]),
      voter3([]),
    ]);

    console.log("is majority?", isMajority);
    expect(isMajority).toBeDefined();
  });
});
