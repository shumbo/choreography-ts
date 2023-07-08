import { Choreography, Located } from "@choreography-ts/core"
import { ExpressBackend } from "@choreography-ts/backend-express"

// Typescript Choreopgraphic implementation of the Diffie-Hellman key exchange algorithm
// Ported from the HasChor implementation here: https://github.com/gshen42/HasChor/blob/42ae1ef9a500dadd82f0cfe5dee3c2aa631d8f4d/examples/diffiehellman/Main.hs

// Helper functions //
const divisors = (x : number) : number[] => {
  let divs : number[] = []
  for (let y : number = 2; y <= x / 2; y++) {
    if (x % y == 0) divs.concat(y)
  }
  return divs
}

const isPrime = (x : number) : boolean => {
  let divs : number[] = divisors(x)
  if (divs.length == 2) {
    if (divs[0] == 1 && divs[1] == x) return true
    return false
  }
  return false
}

const primeNums = function*() {
  let y = 1
  while (y++ > 0) {
    if (isPrime(y)) yield y
  }
}

const locations = ["alice", "bob"]
export type Location = (typeof locations)[number]

export const diffieHellman = <A extends Location, B extends Location>
(
  a : A,
  b : B
) => {
  const choreo : Choreography<
    Location 
  > = async ({locally, broadcast, comm, call}) => {
    // Wait for "alice" to start key exchange
    const waitForAToBegin = await locally(a, (unwrap) => {
      console.log("Press enter to begin...")
      // Read from stdin: https://stackoverflow.com/questions/5006821/nodejs-how-to-read-keystrokes-from-stdin
      process.stdin.on('data', (key) => {
        if (key === '\u000d') {
          return true
        }
        return false
      })
    })
  }
}