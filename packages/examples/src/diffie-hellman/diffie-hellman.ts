import {
  Choreography,
  MultiplyLocated,
  Projector,
  Location,
} from "@choreography-ts/core";
import {
  HttpConfig,
  ExpressTransport,
} from "@choreography-ts/transport-express";

// Typescript implementation of the Diffie-Hellman key exchange algorithm
// Ported from the HasChor implementation here: https://github.com/gshen42/HasChor/blob/42ae1ef9a500dadd82f0cfe5dee3c2aa631d8f4d/examples/diffiehellman/Main.hs

//////////////////////
// Helper functions //
/////////////////////

// Return all divisors of `x`
const divisors = (x: number): number[] => {
  const divs = [1, x];
  for (let y = 2; y <= x / 2; y++) {
    if (x % y == 0) divs.push(y);
  }
  return divs;
};

// Checks if input number is prime
const isPrime = (x: number): boolean => {
  const divs = divisors(x);
  if (divs.length == 2) return true;
  return false;
};

// Prime number generator
const primeNums = function* () {
  let y = 1;
  while (y++ > 0) {
    if (isPrime(y)) yield y;
  }
};

// Return random integer in range [min, max]
// https://stackoverflow.com/a/7228322
const randInRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

///////////////////////////////////
// Diffie-Hellman implementation //
///////////////////////////////////
const locations = ["alice", "bob"] as const;
export type L = (typeof locations)[number];

export const diffieHellman = <A extends Location, B extends Location>(
  a: A,
  b: B,
) => {
  const choreo: Choreography<
    A | B,
    MultiplyLocated<boolean, A>, // Specify boolean argument specifically for location "A" ("A|B" instead would mean for both)
    [MultiplyLocated<number, A>, MultiplyLocated<number, B>]
  > = async ({ locally, comm }, arg) => {
    // The `arg` specifies whether `a` should wait to initiate key exchange

    // Wait for alice to start key exchange (if desired)
    await locally(a, async (unwrap) => {
      console.log("Press enter to begin key exchange...");
      // Check for key input on stdin in node: https://stackoverflow.com/a/72906729
      const wait = unwrap(arg);
      return new Promise<void>((resolve) => {
        if (wait) {
          // If waiting is desired
          process.stdin
            .setRawMode(true)
            .setEncoding("utf8")
            .resume()
            .on("data", (key: string) => {
              if (key.charCodeAt(0) == 0xd) {
                process.stdin.setRawMode(false).pause();
                resolve();
              } else if (key.charCodeAt(0) == 0x3) {
                process.exit(); // Ctrl-c
              }
            });
        } else {
          resolve();
        }
      });
    });
    await locally(b, () =>
      console.log("Waiting for alice to begin exchange..."),
    );

    // Alice picks p and g to send to bob
    const pa = await locally(a, () => {
      const x = randInRange(200, 1000); // Random number in range [200, 1000]
      const primeGen = primeNums();
      let prime = primeGen.next().value as number;
      for (let i = 0; i < x; i++) prime = primeGen.next().value as number;
      return prime;
    });
    const pb = await comm(a, b, pa);
    const ga = await locally(a, (unwrap) => randInRange(10, unwrap(pa)));
    const gb = await comm(a, b, ga);

    // Alice and bob pick secrets
    const sa = await locally(a, () => randInRange(200, 1000));
    const sb = await locally(b, () => randInRange(200, 1000));

    // Alice and bob compute and exchange numbers
    const a_ = await locally(
      a,
      (unwrap) => unwrap(ga) ^ unwrap(sa) % unwrap(pa),
    );
    const b_ = await locally(
      b,
      (unwrap) => unwrap(gb) ^ unwrap(sb) % unwrap(pb),
    );
    const a__ = await comm(a, b, a_); // Send a_ to b
    const b__ = await comm(b, a, b_); // Send b_ to a

    // Compute shared key
    const s1 = await locally(a, (unwrap) => {
      const s = unwrap(b__) ^ unwrap(sa) % unwrap(pa);
      console.log("Alice's shared key:", s);
      return s;
    });
    const s2 = await locally(b, (unwrap) => {
      const s = unwrap(a__) ^ unwrap(sb) % unwrap(pb);
      console.log("Bob's shared key:", s);
      return s;
    });
    return [s1, s2];
  };
  return choreo;
};

/////////////
// Testing //
/////////////
async function main(host: string): Promise<void> {
  const config: HttpConfig<L> = {
    alice: ["localhost", 3000],
    bob: ["localhost", 3001],
  };

  const keyExchange = diffieHellman("alice", "bob");
  if (host === "alice") {
    const aliceTransport = await ExpressTransport.create(config, "alice");
    const aliceProjector = new Projector(aliceTransport, "alice");
    await aliceProjector.epp(keyExchange)(aliceProjector.local(true));
  } else {
    const bobTransport = await ExpressTransport.create(config, "bob");
    const bobProjector = new Projector(bobTransport, "bob");
    await bobProjector.epp(keyExchange)(bobProjector.remote("alice"));
  }
}

if (require.main === module) {
  if (process.argv[2] === "alice") {
    main("alice");
  } else if (process.argv[2] === "bob") {
    main("bob");
  } else {
    console.error("Usage: node diffie-hellman.js <alice | bob>");
  }
}
