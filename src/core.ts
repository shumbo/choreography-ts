/**
 * A choreography involving locations of type `L` and returning a located value
 */
export type Choreography<L extends string, T, GArgs = void> = (
  deps: Dependencies<L>,
  globalArgs: GArgs
) => Promise<T>;

/**
 * The dependencies of a choreography
 */
export type Dependencies<L extends string> = {
  locally: Locally<L>;
  comm: Comm<L>;
  broadcast: Broadcast<L>;
  call: CallChoreography<L>;
};

/**
 * Perform a local computation at location `L1` and return a value of type `T`
 */
export type Locally<L extends string> = <L1 extends L, T>(
  location: L1,
  callback: (unwrap: Unwrap<L1>) => T
) => Promise<Located<T, L1>>;

/**
 * Send a value of type `T` from location `L1` to location `L2`
 */
export type Comm<L extends string> = <L1 extends L, L2 extends L, T>(
  sender: L1,
  receiver: L2,
  value: Located<T, L1>
) => Promise<Located<T, L2>>;

/**
 * Broadcast a value of type `T` from location `L1` to all other locations
 */
export type Broadcast<L extends string> = <L1 extends L, T>(
  sender: L1,
  value: Located<T, L1>
) => Promise<T>;

export type CallChoreography<L extends string> = <LL extends L, T, GArgs>(
  choreography: Choreography<LL, T, GArgs>
) => Promise<T>;

export type Unwrap<L1 extends string> = <T>(located: Located<T, L1>) => T;

export interface Backend<L extends string> {
  run: <L1 extends L, GArgs>(
    choreography: Choreography<L, void, GArgs>,
    location: L1,
    args: GArgs
  ) => Promise<void>;
}

export class Located<T, L1 extends string> {
  constructor(value: T, key: Symbol) {
    this.value = value;
    this.key = key;
  }
  /**
   *
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
