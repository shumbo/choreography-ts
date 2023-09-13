/* eslint-disable @typescript-eslint/ban-ts-comment */

import { DefaultDict } from "./lib/default-dict";
import { IVar } from "./lib/ivar";
import { setEqual } from "./lib/set-equal";
import { Tag } from "./lib/tag";
import { wrapMethods } from "./lib/wrap-methods";

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

export class Colocated<T, L extends Location> {
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
  protected phantom?: (x: L) => void;
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
  located: Located<T, L1> | Colocated<T, L1>
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
  Args extends Located<any, LL>[],
  Return extends Located<any, LL>[]
>(
  locations: LL[],
  choreography: Choreography<LL, Args, Return>,
  args: Args
) => Promise<Return>;

export type Peel<L extends Location> = <LL extends L, T>(
  colocated: Colocated<T, LL>
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
 * A type-level utility to unwrap all located values to normal values
 */
export type AllElements<A> = A extends [
  Located<infer T, infer _>,
  ...infer TAIL
]
  ? [T, ...AllElements<TAIL>]
  : [];

/**
 * Represents a subscription that can be removed
 */
export interface Subscription {
  remove(): void;
}

/**
 * A parcel is a message that is sent from one location to another
 * @typeParam L - A set of possible locations
 */
export type Parcel<L extends Location> = {
  from: L;
  to: L;
  tag: Tag;
  data: any;
};

export function parcelFromJSON<L extends Location>(json: string): Parcel<L> {
  const obj = JSON.parse(json);
  const parcel: Parcel<L> = {
    from: obj.from,
    to: obj.to,
    tag: new Tag(JSON.parse(obj.tag)),
    data: obj.data,
  };
  return parcel;
}

/**
 * A log manager is responsible for saving and loading logged values from a persistent storage for fault tolerance.
 */
export interface LogManager {
  /**
   * Write a value to the log
   * @param lid the identifier of the log entry
   * @param data data to be written
   */
  write<T>(lid: string, data: T): Promise<void>;
  /**
   * Read a value from the log
   * @param lid the identifier of the log entry
   * @returns a promise that resolves the object with the `ok` field, which is `true` if the log entry exists, and `false` otherwise.
   */
  read<T>(lid: string): Promise<{ ok: true; value: T } | { ok: false }>;
}

/**
 * This is a dummy log manager that does not actually log anything.
 * It is used when no log manager is provided.
 */
class NotLogManager implements LogManager {
  public async write<T>(_lid: string, _data: T): Promise<void> {
    return;
  }
  public async read<T>(
    _lid: string
  ): Promise<{ ok: true; value: T } | { ok: false }> {
    return { ok: false };
  }
}

/**
 * A transport is responsible for sending parcels from one location to another
 * @typeParam L - A set of possible locations
 */
export abstract class Transport<L extends Location, L1 extends L> {
  abstract get locations(): readonly L[];
  public abstract teardown(): Promise<void>;
  public abstract send(parcel: Parcel<L>): Promise<void>;
  public abstract subscribe(cb: (p: Parcel<L>) => void): Subscription;
  private phantom?: L1;
}

export class Projector<L extends Location, L1 extends L> {
  private inbox: DefaultDict<string, IVar>;
  private subscription: Subscription | null;
  constructor(public transport: Transport<L, L1>, private target: L1) {
    this.inbox = new DefaultDict<string, IVar<Parcel<L>>>(() => new IVar());
    this.subscription = this.transport.subscribe((parcel) => {
      const key = this.key(parcel.from, parcel.to, parcel.tag);
      this.inbox.get(key).write(parcel);
    });
  }
  public destructor() {
    this.subscription?.remove();
  }
  private key(src: L, dest: L, tag: Tag): string {
    return `${src.toString()}:${dest.toString()}:${tag.toString()}`;
  }
  private async sendTag(from: L, to: L, tag: Tag, data: any): Promise<void> {
    const parcel: Parcel<L> = {
      to,
      from,
      data,
      tag,
    };
    await this.transport.send(parcel);
  }
  private async receiveTag(from: L, to: L, tag: Tag): Promise<any> {
    const key = this.key(from, to, tag);
    const parcel = await this.inbox.get(key).read();
    this.inbox.delete(key);
    return parcel.data;
  }
  epp<Args extends Located<any, L>[], Return extends Located<any, L>[]>(
    choreography: Choreography<L, Args, Return>
  ): (
    args: LocatedElements<L, L1, Args>,
    options?: { logManager?: LogManager }
  ) => Promise<LocatedElements<L, L1, Return>> {
    return async (args, options) => {
      const logManager = options?.logManager ?? new NotLogManager();

      const tag = new Tag();
      const key = Symbol(this.target.toString());
      const ctxManager = new ContextManager<L>(this.transport.locations);
      const locally: (t: Tag) => Locally<L> = (tag) => {
        return async <L2 extends L, T>(
          loc: L2,
          callback: (unwrap: Unwrap<L2>) => T | Promise<T>
        ) => {
          tag.comm();

          // @ts-ignore - no easy way to type this
          if (loc !== this.target) {
            return undefined as any;
          }

          const log = await logManager.read(tag.toJSON());
          if (log.ok) {
            return new Located(log.value, key);
          }
          const retVal = callback((located) => located.getValue(key));
          let v: T;
          if (retVal instanceof Promise) {
            v = await retVal;
          } else {
            v = retVal;
          }
          await logManager.write(tag.toJSON(), v);
          return new Located(v, key);
        };
      };

      const comm: (t: Tag) => Comm<L> =
        (t: Tag) =>
        async <L1 extends L, L2 extends L, T>(
          sender: L1,
          receiver: L2,
          value: Located<T, L1>
        ) => {
          t.comm();

          const log = await logManager.read(t.toJSON());
          if (log.ok) {
            return new Located(log.value, key);
          }

          // @ts-ignore
          if (sender === receiver) {
            // if sender and receiver are the same, just return the value
            return value;
          }
          // @ts-ignore
          if (this.target === sender) {
            // if sender, send value to receiver
            await this.transport.send({
              from: sender,
              to: receiver,
              tag: t,
              data: value.getValue(key),
            });
            await logManager.write(t.toJSON(), value.getValue(key));
            return undefined as any;
          }
          // @ts-ignore
          if (this.target === receiver) {
            // if receiver, wait for value from sender and return
            const message: T = await this.receiveTag(sender, receiver, t);
            await logManager.write(t.toJSON(), message);
            return new Located<T, L2>(message, key);
          }
          return undefined as any;
        };

      const colocally: (t: Tag) => Colocally<L> =
        (t: Tag) =>
        async <
          LL extends L,
          Args extends Located<any, LL>[],
          Return extends Located<any, LL>[]
        >(
          locations: LL[],
          choreography: Choreography<LL, Args, Return>,
          args: Args
        ) => {
          const childTag = t.call();
          return ctxManager.withContext(new Set(locations), async () => {
            // @ts-ignore
            if (locations.includes(this.target)) {
              const ret = await choreography(
                wrapMethods((m) => ctxManager.checkContext(m), {
                  locally: locally(childTag),
                  comm: comm(childTag),
                  colocally: colocally(childTag),
                  multicast: multicast(childTag),
                  broadcast: broadcast(childTag),
                  call: call(childTag),
                  peel: (v) => v.getValue(key),
                }),
                args
              );
              return ret;
            }
            // any index of returned iterator may be accessed while the value will not be used.
            // return a generator that returns undefined for each index
            return {
              *[Symbol.iterator]() {
                for (;;) {
                  yield undefined;
                }
              },
            } as any;
          });
        };

      const multicast: (t: Tag) => Multicast<L> =
        (t: Tag) =>
        async <L1 extends L, const LL extends L, T>(
          sender: L1,
          receivers: LL[],
          value: Located<T, L1>
        ) => {
          t.comm();

          // @ts-ignore
          if (this.target === sender) {
            // if sender, send value to all receivers
            const promises: Promise<any>[] = [];
            const v = value.getValue(key);
            for (const receiver of receivers) {
              // @ts-ignore
              if (receiver !== sender) {
                promises.push(
                  (async () => {
                    const lid = t.toJSON() + ":" + receiver;
                    const log = await logManager.read(lid);
                    if (log.ok) {
                      return;
                    }
                    await this.sendTag(sender, receiver, t, v);
                    await logManager.write(lid, v);
                  })()
                );
              }
            }
            await Promise.all(promises);
            return new Colocated<T, LL | L1>(v, key);
            // @ts-ignore
          } else if (receivers.includes(this.target)) {
            const log = await logManager.read<T>(t.toJSON());
            if (log.ok) {
              return new Colocated<T, LL | L1>(log.value, key);
            }
            // if not sender, wait for value to be sent
            const message: T = await this.receiveTag(sender, this.target, t);
            await logManager.write(t.toJSON(), message);
            return new Colocated<T, LL | L1>(message, key);
          }
          return undefined as any;
        };

      const broadcast: (t: Tag) => Broadcast<L> =
        (t: Tag) =>
        async <L1 extends L, T>(sender: L1, value: Located<T, L1>) => {
          t.comm();
          // @ts-ignore
          if (this.target === sender) {
            // if sender, broadcast value to all other locations
            const promises: Promise<any>[] = [];
            const v = value.getValue(key);
            const locations = ctxManager.getLocationsInContext();
            for (const receiver of locations) {
              // @ts-ignore
              if (receiver !== sender) {
                promises.push(
                  (async () => {
                    const lid = t.toJSON() + ":" + receiver;
                    const log = await logManager.read(lid);
                    if (log.ok) {
                      return;
                    }
                    await this.sendTag(sender, receiver, t, v);
                    await logManager.write(lid, v);
                  })()
                );
              }
            }
            await Promise.all(promises);
            return v;
          } else {
            const log = await logManager.read<T>(t.toJSON());
            if (log.ok) {
              log.value;
            }
            // if not sender, wait for value to arrive
            const data = await this.receiveTag(sender, this.target, t);
            await logManager.write(t.toJSON(), data);
            return data;
          }
        };

      const peel: Peel<L> = <LL extends L, T>(cv: Colocated<T, LL>) =>
        cv.getValue(key);

      const call: (t: Tag) => Call<L> =
        (t: Tag) =>
        async <
          LL extends L,
          Args extends Located<any, LL>[],
          Return extends Located<any, LL>[]
        >(
          c: Choreography<LL, Args, Return>,
          a: Args
        ) => {
          const childTag = t.call();
          return await c(
            wrapMethods((m) => ctxManager.checkContext(m), {
              locally: locally(childTag),
              comm: comm(childTag),
              broadcast: broadcast(childTag),
              call: call(childTag),
              multicast: multicast(childTag),
              colocally: colocally(childTag),
              peel: peel,
            }),
            a
          );
        };

      const ret = await choreography(
        wrapMethods((m) => ctxManager.checkContext(m), {
          locally: locally(tag),
          comm: comm(tag),
          broadcast: broadcast(tag),
          call: call(tag),
          multicast: multicast(tag),
          colocally: colocally(tag),
          peel: peel,
        }),
        args.map((x) => new Located(x, key)) as any
      );
      return ret.map((x) =>
        x instanceof Located ? x.getValue(key) : undefined
      ) as any;
    };
  }
}

/**
 * `ContextManager` is responsible for keeping track of active locations in the active context.
 */
export class ContextManager<L extends Location> {
  private context: Set<L>;
  constructor(locations: readonly L[]) {
    this.context = new Set(locations);
  }
  /**
   * `withContext` executes a function with updated context
   * @param context - context to be used for the duration of function execution
   * @param callback - function to be executed
   * @returns the same as the return of `callback`
   */
  public async withContext<T>(
    context: Set<L>,
    callback: () => Promise<T>
  ): Promise<T> {
    const oldContext = this.context;
    this.context = context;
    const ret = await callback();
    this.context = oldContext;
    return ret;
  }
  public checkContext<P extends Array<any>, T>(fn: (...x: P) => T) {
    const currentContext = new Set(this.context);
    return (...args: P) => {
      if (!setEqual(currentContext, this.context)) {
        throw new Error("Invalid context");
      }
      return fn(...args);
    };
  }
  public getLocationsInContext(): Set<L> {
    return new Set(this.context);
  }
}

export class Runner {
  public compile<
    L extends Location,
    Args extends Located<any, L>[],
    Return extends Located<any, L>[]
  >(
    choreography: Choreography<L, Args, Return>
  ): (args: AllElements<Args>) => Promise<AllElements<Return>> {
    return async (args) => {
      const key = Symbol();
      const locally: Locally<L> = async <L1 extends L, T>(
        _: L1,
        callback: (unwrap: Unwrap<L1>) => T | Promise<T>
      ) => {
        const retVal = await callback((located) => located.getValue(key));
        let v: T;
        if (retVal instanceof Promise) {
          v = await retVal;
        } else {
          v = retVal;
        }
        return new Located(v, key);
      };
      const comm: Comm<L> = async <L1 extends L, L2 extends L, T>(
        _sender: L1,
        _receiver: L2,
        value: Located<T, L1>
      ) => {
        return new Located(value.getValue(key), key);
      };
      const colocally: Colocally<L> = async <
        LL extends L,
        Args extends Located<any, LL>[],
        Return extends Located<any, LL>[]
      >(
        _locations: LL[],
        choreography: Choreography<LL, Args, Return>,
        args: Args
      ) => {
        const ret = await choreography(
          wrapMethods((m) => m, {
            locally: locally,
            comm: comm,
            colocally: colocally,
            multicast: multicast,
            broadcast: broadcast,
            call: call,
            peel: peel,
          }),
          args
        );
        return ret;
      };
      const multicast: Multicast<L> = async <
        L1 extends L,
        const LL extends L,
        T
      >(
        _sender: L1,
        _receivers: LL[],
        value: Located<T, L1>
      ) => {
        return new Colocated(value.getValue(key), key);
      };
      const broadcast: Broadcast<L> = async <L1 extends L, T>(
        _sender: L1,
        value: Located<T, L1>
      ) => {
        return value.getValue(key);
      };
      const call: Call<L> = async <
        LL extends L,
        Args extends Located<any, LL>[],
        Return extends Located<any, LL>[]
      >(
        c: Choreography<LL, Args, Return>,
        a: Args
      ) => {
        const ret = await c(
          wrapMethods((m) => m, {
            locally: locally,
            comm: comm,
            broadcast: broadcast,
            call: call,
            multicast: multicast,
            colocally: colocally,
            peel: peel,
          }),
          a
        );
        return ret;
      };
      const peel: Peel<L> = <LL extends L, T>(cv: Colocated<T, LL>) =>
        cv.getValue(key);

      const ret = await choreography(
        {
          locally: locally,
          comm: comm,
          broadcast: broadcast,
          call: call,
          multicast: multicast,
          colocally: colocally,
          peel: peel,
        },
        args.map((x) => new Located(x, key)) as any
      );
      return ret.map((x) =>
        x instanceof Located ? x.getValue(key) : undefined
      ) as any;
    };
  }
}
