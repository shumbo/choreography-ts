/**
 * A type for representing a location
 */
export type Location = string;

/**
 * A class for representing a located value
 * @typeParam T - The type of the located value
 * @typeParam L1 - The location of the located value
 */
export class Located<T, L1 extends Location> {
  /**
   * Create a new located value
   * @param value value
   * @param key the key associated with the location
   */
  constructor(value: T, key: Symbol) {
    this.value = value;
    this.key = key;
  }
  /**
   * The internal function to get the normal value.
   * Use `unwrap` if not defining a custom backend.
   * @internal
   * @param key
   * @returns
   */
  public getValue(key: Symbol) {
    if (this.key !== key) {
      throw new Error("Invalid key");
    }
    return this.value;
  }
  private value: T;
  private key: Symbol;
  private phantom?: L1;
}

/**
 * The dependencies of a choreography
 */
export type Dependencies<L extends Location> = {
  locally: Locally<L>;
  comm: Comm<L>;
  broadcast: Broadcast<L>;
  call: Call<L>;
};

/**
 * Perform a local computation at location `L1` and return a value of type `T`
 * @typeParam L - A set of possible locations
 * @typeParam L1 - The location of the computation
 * @typeParam T - The type of the returned value
 */
export type Locally<L extends Location> = <L1 extends L, T>(
  location: L1,
  callback: (unwrap: Unwrap<L1>) => T
) => Promise<Located<T, L1>>;

export type Unwrap<L1 extends Location> = <T>(located: Located<T, L1>) => T;

/**
 * Send a value of type `T` from location `L1` to location `L2`
 */
export type Comm<L extends Location> = <L1 extends L, L2 extends L, T>(
  sender: L1,
  receiver: L2,
  value: Located<T, L1>
) => Promise<Located<T, L2>>;

/**
 * Broadcast a value of type `T` from location `L1` to all other locations
 */
export type Broadcast<L extends Location> = <L1 extends L, T>(
  sender: L1,
  value: Located<T, L1>
) => Promise<T>;

export type Call<L extends Location> = <
  LL extends L,
  Args extends Located<any, LL>[],
  Return extends Located<any, LL>[]
>(
  choreography: Choreography<LL, Args, Return>,
  args: Args
) => Promise<Return>;

/**
 * A choreography is a function that takes a set of dependencies and a set of arguments and returns a set of results
 * @typeParam L - A set of possible locations
 * @typeParam Args - The types of the arguments. Must be an array of located values.
 * @typeParam Return - The types of the return values. Must be an array of located values.
 * @param deps - The operators that can be used inside the choreography.
 * @param args - The arguments of the choreography.
 */
export type Choreography<
  L extends Location,
  Args extends Located<any, L>[] = [],
  Return extends Located<any, L>[] = []
> = (deps: Dependencies<L>, args: Args) => Promise<Return>;

/**
 * A utility to filter out the values not located at `L1` from an array of located values
 */
export type LocatedElements<L extends Location, L1 extends L, A> = A extends [
  Located<infer T, infer L2>,
  ...infer TAIL
]
  ? L2 extends L1
    ? [T, ...LocatedElements<L, L1, TAIL>]
    : [undefined, ...LocatedElements<L, L1, TAIL>]
  : [];

/**
 * An interface for a backend
 * @typeParam L - A set of possible locations
 */
export interface Backend<L extends Location> {
  /**
   * Execute a choreography at a given location
   * @param choreography - a choreography to execute
   * @param location - a location to execute the choreography at
   * @param args - the arguments of the choreography. Pass `undefined` for arguments that are not located at `location`
   * @returns - the return values of the choreography. Elements of the array are `undefined` if the corresponding return value is not located at `location`
   */
  run: <
    L1 extends L,
    Args extends Located<L, any>[],
    Return extends Located<L, any>[]
  >(
    choreography: Choreography<L, Args, Return>,
    location: L1,
    args: LocatedElements<L, L1, Args>
  ) => Promise<LocatedElements<L, L1, Return>>;
}
