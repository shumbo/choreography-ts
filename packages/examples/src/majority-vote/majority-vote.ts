import { ExpressBackend } from "@choreography-ts/backend-express";
import { Choreography, Located } from "@choreography-ts/core";

export type L = "judge" | "voter1" | "voter2" | "voter3";

type Vote = "yes" | "no";

function doVote<Voter extends L>(voter: Voter) {
  const c: Choreography<L, [], [Located<Vote, "judge">]> = async ({
    comm,
    locally,
  }) => {
    const vote = await locally(voter, () => {
      return Math.random() > 0.5 ? "yes" : "no";
    });
    const voteAtJudge = await comm(voter, "judge", vote);
    return [voteAtJudge];
  };
  return c;
}

export const majorityVote: Choreography<
  "judge" | "voter1" | "voter2" | "voter3",
  [],
  [Located<boolean, "judge">]
> = async ({ locally, call }) => {
  const pendingVote1 = call(doVote("voter1"), []);
  const pendingVote2 = call(doVote("voter2"), []);
  const pendingVote3 = call(doVote("voter3"), []);
  const [[vote1], [vote2], [vote3]] = await Promise.all([
    pendingVote1,
    pendingVote2,
    pendingVote3,
  ]);
  const isMajority = await locally("judge", (unwrap) => {
    const votes = [unwrap(vote1), unwrap(vote2), unwrap(vote3)];
    const yesVotes = votes.filter((v) => v === "yes");
    const noVotes = votes.filter((v) => v === "no");
    console.log(`yes: ${yesVotes.length}, no: ${noVotes.length}`);
    if (yesVotes.length > noVotes.length) {
      console.log("majority: yes");
      return true;
    } else {
      console.log("majority: no");
      return false;
    }
  });
  return [isMajority];
};

async function main() {
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
}

if (require.main === module) {
  main();
}
