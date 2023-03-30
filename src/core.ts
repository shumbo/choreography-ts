/**
 * A choreography involving locations of type `L` and returning a located value
 */
export type Choreography<
  L extends string,
  Return extends {
    [L1 in L]?: any;
  } = {},
  GArgs = null,
  LArgs extends {
    [L1 in L]?: any;
  } = {}
> = (
  deps: Dependencies<L>,
  globalArgs: GArgs,
  locatedArgs: {
    [L1 in keyof LArgs]: L1 extends string ? Located<LArgs[L1], L1> : never;
  }
) => Promise<{
  [L1 in keyof Return]: L1 extends string ? Located<Return[L1], L1> : never;
}>;

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

export type CallChoreography<L extends string> = <
  LL extends L,
  Return extends {
    [L1 in L]?: any;
  },
  GArgs,
  LArgs extends {
    [L1 in L]?: any;
  }
>(
  choreography: Choreography<LL, Return, GArgs, LArgs>,
  args: GArgs,
  locatedArgs: {
    [L1 in keyof LArgs]: L1 extends string ? Located<LArgs[L1], L1> : never;
  }
) => Promise<{
  [L1 in keyof Return]: L1 extends string ? Located<Return[L1], L1> : never;
}>;

export type Unwrap<L1 extends string> = <T>(located: Located<T, L1>) => T;

export interface Backend<L extends string> {
  run: <
    L1 extends L,
    GArgs,
    LArgs extends {
      [L1 in L]: any;
    },
    Ret extends {
      [L1 in L]: any;
    }
  >(
    choreography: Choreography<L, Ret, GArgs, LArgs>,
    location: L1,
    args: GArgs,
    locatedArgs: {
      [P in L1]: P extends keyof LArgs ? LArgs[P] : never;
    }
  ) => Promise<L1 extends keyof Ret ? Ret[L1] : never>;
}

export class Located<T, L1 extends string> {
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
