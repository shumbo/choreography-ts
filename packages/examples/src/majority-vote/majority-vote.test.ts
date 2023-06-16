import { ExpressBackend } from "@choreography-ts/backend-express";
import { L, majorityVote } from "./majority-vote";

describe("majorityVote", () => {
  it("test", async () => {
    const backend = new ExpressBackend<L>({
      judge: ["localhost", 3000],
      voter1: ["localhost", 3001],
      voter2: ["localhost", 3002],
      voter3: ["localhost", 3003],
    });
    const judge = backend.epp(majorityVote, "judge");
    const voter1 = backend.epp(majorityVote, "voter1");
    const voter2 = backend.epp(majorityVote, "voter2");
    const voter3 = backend.epp(majorityVote, "voter3");
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
