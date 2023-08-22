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
  constructor(value: T, key: symbol) {
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
  public getValue(key: symbol) {
    if (this.key !== key) {
      throw new Error("Invalid key");
    }
    return this.value;
  }
  protected value: T;
  protected key: symbol;
  protected phantom?: L1;
}

// Base class for `Colocated` that can be extended for contravariance or covariance in parameters
class ColocatedBase<T> {
  constructor(value: T, key: symbol) {
    this.value = value;
    this.key = key;
  }
  public getValue(key: symbol) {
    if (this.key !== key) {
      throw new Error("Invalid key");
    }
    return this.value;
  }
  protected value: T;
  protected key: symbol;
}

// Exported `Colocated` class and the corresponding covariant or contravariant type variations
export class Colocated<T, L extends Location> extends ColocatedBase<T> {
  phantom?: ((x: L) => void) & L;
}
export class ColocatedContravariant<T, L extends Location> extends ColocatedBase<T> {
  phantom?: (x: L) => void;
}
export class ColocatedCovariant<T, L extends Location> extends ColocatedBase<T> {
  phantom?: L;
}

/**
 * The dependencies of a choreography
 */
export type Dependencies<L extends Location> = {
  locally: Locally<L>;
  comm: Comm<L>;
  colocally: Colocally<L>;
  multicast: Multicast<L>;
  broadcast: Broadcast<L>;
  call: Call<L>;
  peel: Peel<L>;
};

/**
 * Perform a local computation at location `L1` and return a value of type `T`
 * @typeParam L - A set of possible locations
 * @typeParam L1 - The location of the computation
 * @typeParam T - The type of the returned value
 */
export type Locally<L extends Location> = <L1 extends L, T>(
  location: L1,
  callback: (unwrap: Unwrap<L1>) => T | Promise<T>
) => Promise<Located<T, L1>>;

export type Unwrap<L1 extends Location> = <T>(
  located: Located<T, L1> | ColocatedContravariant<T, L1>
) => T;

/**
 * Send a value of type `T` from location `L1` to location `L2`
 */
export type Comm<L extends Location> = <L1 extends L, L2 extends L, T>(
  sender: L1,
  receiver: L2,
  value: Located<T, L1>
) => Promise<Located<T, L2>>;

export type Colocally<L extends Location> = <
  LL extends L,
  Args extends (ColocatedCovariant<any, LL> | Located<any, LL>)[],
  Return extends (ColocatedCovariant<any, LL> | Located<any, LL>)[]
>(
  locations: LL[],
  choreography: Choreography<LL, Args, Return>,
  args: Args
) => Promise<Return>;

export type Peel<L extends Location> = <LL extends L, T>(
  colocated: ColocatedContravariant<T, LL>
) => T;

export type Multicast<L extends Location> = <
  L1 extends L,
  const LL extends L,
  T
>(
  sender: L1,
  receivers: LL[],
  value: Located<T, L1>
) => Promise<Colocated<T, LL | L1>>;

/**
 * Broadcast a value of type `T` from location `L1` to all other locations
 */
export type Broadcast<L extends Location> = <L1 extends L, T>(
  sender: L1,
  value: Located<T, L1>
) => Promise<T>;

export type Call<L extends Location> = <
  LL extends L,
  Args extends (ColocatedCovariant<any, LL> | Located<any, LL>)[],
  Return extends (ColocatedCovariant<any, LL> | Located<any, LL>)[]
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
  Args extends (ColocatedCovariant<any, L> | Located<any, L>)[] = [],
  Return extends (ColocatedCovariant<any, L> | Located<any, L>)[] = []
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
   * End-point project a choreography at a given location
   * @param choreography - a choreography to project
   * @param location - a location to execute the choreography at
   * @returns - a local program as a function
   */
  epp<
    L1 extends L,
    Args extends (ColocatedCovariant<L, any> | Located<L, any>)[],
    Return extends (ColocatedCovariant<L, any> | Located<L, any>)[]
  >(
    choreography: Choreography<L, Args, Return>,
    location: L1
  ): (
    args: LocatedElements<L, L1, Args>
  ) => Promise<LocatedElements<L, L1, Return>>;
}
