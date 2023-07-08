import { Choreography, Located } from "@choreography-ts/core";
import { ExpressBackend } from "@choreography-ts/backend-express";

// Typescript implementation of the Diffie-Hellman key exchange algorithm
// Ported from the HasChor implementation here: https://github.com/gshen42/HasChor/blob/42ae1ef9a500dadd82f0cfe5dee3c2aa631d8f4d/examples/diffiehellman/Main.hs

//////////////////////
// Helper functions //
/////////////////////

// Return all divisors of `x`
const divisors = (x: number): number[] => {
  let divs: number[] = [1, x];
  for (let y = 2; y <= x / 2; y++) {
    if (x % y == 0) divs.push(y);
  }
  return divs;
};

// Checks if input number is prime
const isPrime = (x: number): boolean => {
  let divs: number[] = divisors(x);
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
const locations = ["alice", "bob"];
export type Location = (typeof locations)[number];

export const diffieHellman = <A extends Location, B extends Location>(
  a: A,
  b: B
) => {
  const choreo: Choreography<
    Location,
    [Located<boolean, A>], // Specify boolean argument specifically for location "A" ("A|B" instead would mean for both)
    [Located<number, A>, Located<number, B>]
  > = async ({ locally, comm }, [arg]) => {
    // The `arg` specifies whether `a` should wait to initiate key exchange

    // Wait for alice to start key exchange (if desired)
    await locally(a, (unwrap: any) => {
      console.log("Press enter to begin key exchange...");
      // Check for key input on stdin in node: https://stackoverflow.com/a/72906729
      let status: boolean = !unwrap(arg);
      if (!status) {
        // If waiting is desired
        process.stdin
          .setRawMode(true)
          .setEncoding("utf8")
          .resume()
          .on("data", (key: string) => {
            if (key.charCodeAt(0) == 0xd) {
              process.stdin.setRawMode(false).pause();
              status = true;
            } else if (key.charCodeAt(0) == 0x3) {
              process.exit(); // Ctrl-c
            }
          });
      }
      return new Promise<void>((resolve) => {
        let id = setInterval(() => {
          if (status) {
            clearInterval(id); // Clear the interval checking
            resolve(); // Begin key exchange
          }
        });
      });
    });
    await locally(b, () =>
      console.log("Waiting for alice to begin exchange...")
    );

    // Alice picks p and g to send to bob
    const pa = await locally(a, () => {
      const x = randInRange(200, 1000); // Random number in range [200, 1000]
      const primeGen = primeNums();
      let prime = primeGen.next().value;
      for (let i = 0; i < x; i++) prime = primeGen.next().value;
      return prime;
    });
    const pb = await comm(a, b, pa);
    const ga = await locally(a, (unwrap: any) => randInRange(10, unwrap(pa)));
    const gb = await comm(a, b, ga);

    // Alice and bob pick secrets
    const sa = await locally(a, () => randInRange(200, 1000));
    const sb = await locally(b, () => randInRange(200, 1000));

    // Alice and bob compute and exchange numbers
    const a_ = await locally(
      a,
      (unwrap: any) => unwrap(ga) ^ unwrap(sa) % unwrap(pa)
    );
    const b_ = await locally(
      b,
      (unwrap: any) => unwrap(gb) ^ unwrap(sb) % unwrap(pb)
    );
    const a__ = await comm(a, b, a_); // Send a_ to b
    const b__ = await comm(b, a, b_); // Send b_ to a

    // Compute shared key
    const s1 = await locally(a, (unwrap: any) => {
      const s = unwrap(b__) ^ unwrap(sa) % unwrap(pa);
      console.log("Alice's shared key:", s);
      return s;
    });
    const s2 = await locally(b, (unwrap: any) => {
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
  const backend = new ExpressBackend<Location>({
    alice: ["localhost", 3000],
    bob: ["localhost", 3001],
  });
  const keyExchange = diffieHellman("alice", "bob");
  if (host === "alice") {
    await Promise.resolve(backend.epp(keyExchange, "alice")([true]));
  } else {
    await Promise.resolve(backend.epp(keyExchange, "bob")([undefined]));
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
