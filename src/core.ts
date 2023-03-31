export type Location = string | number | symbol;

export class Located<T, L1 extends Location> {
  constructor(value: T, key: Symbol) {
    this.value = value;
    this.key = key;
  }
  /**
   *
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

export type Choreography<
  L extends Location,
  Args extends Located<any, L>[] = [],
  Return extends Located<any, L>[] = []
> = (x: Dependencies<L>, args: Args) => Promise<Return>;

export type LocatedElements<L extends Location, L1 extends L, A> = A extends [
  Located<infer T, infer L2>,
  ...infer TAIL
]
  ? L2 extends L1
    ? [T, ...LocatedElements<L, L1, TAIL>]
    : [undefined, ...LocatedElements<L, L1, TAIL>]
  : [];

export interface Backend<L extends Location> {
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
