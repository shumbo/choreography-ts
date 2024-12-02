import {
  Choreography,
  MultiplyLocated,
  Projector,
} from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

export type L = "judge" | "voter1" | "voter2" | "voter3";

type Vote = "yes" | "no";

function reduceWhile<T, U>(
  promises: Promise<T>[],
  reducer: (
    accumulator: U,
    value: T,
    acceptedCount: number,
    rejectedCount: number,
  ) => [boolean, U],
  initialValue: U,
): Promise<U> {
  let accumulator: U = initialValue;
  let acceptedCount = 0;
  let rejectedCount = 0;
  return new Promise<U>((resolve) => {
    function checkCondition() {
      if (acceptedCount + rejectedCount === promises.length) {
        resolve(accumulator);
      }
    }
    function handlePromiseResult(value: T) {
      const [cont, updatedValue] = reducer(
        accumulator,
        value,
        acceptedCount,
        rejectedCount,
      );
      accumulator = updatedValue;
      if (!cont) {
        resolve(accumulator);
      }
    }
    promises.forEach((promise) => {
      promise
        .then((value) => {
          acceptedCount += 1;
          handlePromiseResult(value);
        })
        .catch(() => {
          rejectedCount += 1;
        })
        .finally(() => {
          checkCondition();
        });
    });
    checkCondition();
  });
}

function doVote<Voter extends L>(voter: Voter) {
  const c: Choreography<L, [], [MultiplyLocated<Vote, "judge">]> = async ({
    comm,
    locally,
  }) => {
    const vote = await locally(voter, () => {
      const v = Math.random() > 0.5 ? "yes" : "no";
      console.log(`${voter} voted ${v}`);
      return v;
    });
    const voteAtJudge = await comm(voter, "judge", vote);
    return [voteAtJudge];
  };
  return c;
}

export const majorityVote: Choreography<
  "judge" | "voter1" | "voter2" | "voter3",
  [],
  [MultiplyLocated<boolean, "judge">]
> = async ({ locally, call }) => {
  const pendingVote1 = call(doVote("voter1"), []);
  const pendingVote2 = call(doVote("voter2"), []);
  const pendingVote3 = call(doVote("voter3"), []);

  const isMajority = await locally("judge", async (unwrap) => {
    const yesCount = await reduceWhile<
      [MultiplyLocated<Vote, "judge">],
      number
    >(
      [pendingVote1, pendingVote2, pendingVote3],
      (accumulator, value, acceptedCount, rejectedCount) => {
        const [locatedVote] = value;
        const vote = unwrap(locatedVote);
        if (vote === "yes") {
          // if voted yes
          // we increment the accumulator
          const newAccumulator = accumulator + 1;
          // if the accumulator is greater than or equal to 2
          if (newAccumulator >= 2) {
            // majority is reached. no need to continue and return the new accumulator
            return [false, newAccumulator];
          } else {
            // majority is not reached. continue and return the new accumulator
            return [true, newAccumulator];
          }
        } else {
          const possibleMoreYes = 3 - acceptedCount - rejectedCount;
          if (accumulator + possibleMoreYes >= 2) {
            // if it is possible to reach majority with the remaining votes, continue
            return [true, accumulator];
          } else {
            // if it is not possible to reach majority with the remaining votes, stop
            return [false, accumulator];
          }
        }
      },
      0,
    );
    console.log(`yesCount: ${yesCount}`);
    return yesCount >= 2;
  });
  return [isMajority];
};

async function main() {
  const config: HttpConfig<L> = {
    judge: ["localhost", 3000],
    voter1: ["localhost", 3001],
    voter2: ["localhost", 3002],
    voter3: ["localhost", 3003],
  };

  const [judgeTransport, voter1Transport, voter2Transport, voter3Transport] =
    await Promise.all([
      ExpressTransport.create(config, "judge"),
      ExpressTransport.create(config, "voter1"),
      ExpressTransport.create(config, "voter2"),
      ExpressTransport.create(config, "voter3"),
    ]);

  const judgeProjector = new Projector(judgeTransport, "judge");
  const voter1Projector = new Projector(voter1Transport, "voter1");
  const voter2Projector = new Projector(voter2Transport, "voter2");
  const voter3Projector = new Projector(voter3Transport, "voter3");

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

  await Promise.all([
    judgeProjector.transport.teardown(),
    voter1Projector.transport.teardown(),
    voter2Projector.transport.teardown(),
    voter3Projector.transport.teardown(),
  ]);
}

if (require.main === module) {
  main();
}
