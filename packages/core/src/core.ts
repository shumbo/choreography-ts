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
  public getValueAt(_at: unknown, key: symbol): T {
    return this.getValue(key);
  }
  protected value: T;
  protected key: symbol;
  protected phantom?: L1;
}

export class MultiplyLocated<T, L extends Location> {
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
  public getValueAt(_at: unknown, key: symbol): T {
    return this.getValue(key);
  }
  protected value: T;
  protected key: symbol;

  // both are required to avoid subtype relations
  protected phantom1?: (_: L) => void;
  protected phantom2?: L;

  protected static remote<T, L extends Location>(): MultiplyLocated<T, L> {
    return new MultiplyLocated(undefined as any, undefined as any);
  }
}

export class Faceted<T, L extends Location> {
  constructor(map: { [loc in L]: T }, key: symbol) {
    this.value = map;
    this.key = key;
  }
  public getValueAt(at: L, key: symbol): T {
    if (this.key !== key) {
      throw new Error("Invalid key");
    }
    return this.value[at];
  }
  protected value: { [loc in L]: T };
  protected key: symbol;
  protected phantom?: (x: L) => void;
}

/**
 * The dependencies of a choreography
 */
export type Dependencies<L extends Location> = {
  locally: Locally<L>;
  comm: Comm<L>;
  enclave: Enclave<L>;
  multicast: Multicast<L>;
  broadcast: Broadcast<L>;
  call: Call<L>;
  naked: Naked<L>;
  parallel: Parallel<L>;
  fanout: FanOut<L>;
  fanin: FanIn<L>;
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
) => Promise<MultiplyLocated<T, L1>>;

export type Unwrap<L1 extends Location> = <S extends Location, T>(
  located: (L1 extends S ? MultiplyLocated<T, S> : never) | Faceted<T, L1>
) => T;

/**
 * Send a value of type `T` from location `L1` to location `L2`
 */
export type Comm<L extends Location> = <L1 extends L, L2 extends L, T>(
  sender: L1,
  receiver: L2,
  value: MultiplyLocated<T, L1>
) => Promise<MultiplyLocated<T, L2>>;

export type Enclave<L extends Location> = <LL extends L, Args, Return>(
  locations: LL[],
  choreography: Choreography<LL, Args, Return>,
  args: Args
) => Promise<MultiplyLocated<Return, LL>>;

export type Naked<L extends Location> = <T>(mlv: MultiplyLocated<T, L>) => T;

export type Multicast<L extends Location> = <
  L1 extends L,
  const LL extends L,
  T,
>(
  sender: L1,
  receivers: LL[],
  value: Located<T, L1> | Faceted<T, L1> | MultiplyLocated<T, L1>
) => Promise<MultiplyLocated<T, LL | L1>>;

/**
 * Broadcast a value of type `T` from location `L1` to all other locations
 */
export type Broadcast<L extends Location> = <S extends L, L1 extends L, T>(
  sender: L1,
  value: L1 extends S ? MultiplyLocated<T, S> : never
) => Promise<T>;

export type Call<L extends Location> = <LL extends L, Args, Return>(
  choreography: Choreography<LL, Args, Return>,
  args: Args
) => Promise<Return>;

export type Parallel<L extends Location> = <const QS extends L, T>(
  locations: QS[],
  callback: <Q extends QS>(member: Q, unwrap: Unwrap<Q>) => Promise<T>
) => Promise<Faceted<T, QS>>;

export type FanOut<L extends Location> = <QS extends L, T>(
  locations: QS[],
  c: <Q extends QS>(q: Q) => Choreography<L, undefined, MultiplyLocated<T, QS>>
) => Promise<Faceted<T, QS>>;

export type FanIn<L extends Location> = <
  const QS extends L,
  const RS extends L,
  T,
>(
  participants: QS[],
  recipients: RS[],
  c: <Q extends QS>(loc: Q) => Choreography<L, [], MultiplyLocated<T, RS>>
) => Promise<Located<{ [key in QS]: T }, RS>>;

/**
 * A choreography is a function that takes a set of dependencies and a set of arguments and returns a set of results
 * @typeParam L - A set of possible locations
 * @typeParam Args - The types of the arguments.
 * @typeParam Return - The types of the return values.
 * @param deps - The operators that can be used inside the choreography.
 * @param args - The arguments of the choreography.
 */
export type Choreography<
  L extends Location,
  Args = undefined,
  Return = undefined,
> = (deps: Dependencies<L>, args: Args) => Promise<Return>;

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
  private key: symbol;
  private inbox: DefaultDict<string, IVar>;
  private subscription: Subscription | null;
  constructor(
    public transport: Transport<L, L1>,
    private target: L1
  ) {
    this.key = Symbol(target.toString());
    this.inbox = new DefaultDict<string, IVar<Parcel<L>>>(() => new IVar());
    this.subscription = this.transport.subscribe((parcel) => {
      const key = this.getReceiveKey(parcel.from, parcel.to, parcel.tag);
      this.inbox.get(key).write(parcel);
    });
  }
  public destructor() {
    this.subscription?.remove();
  }
  private getReceiveKey(src: L, dest: L, tag: Tag): string {
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
    const key = this.getReceiveKey(from, to, tag);
    const parcel = await this.inbox.get(key).read();
    this.inbox.delete(key);
    return parcel.data;
  }
  public epp<Args, Return>(
    choreography: Choreography<L, Args, Return>
  ): (args: Args, options?: { logManager?: LogManager }) => Promise<Return> {
    return async (args, options) => {
      const logManager = options?.logManager ?? new NotLogManager();

      const tag = new Tag();
      const key = this.key;
      const ctxManager = new ContextManager<L>(this.transport.locations);
      const locally: <X extends L>(_: Tag) => Locally<X> = <X extends L>(
        tag: Tag
      ) => {
        return async <L2 extends X, T>(
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
          const retVal = callback((located) => located.getValueAt(loc, key));
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

      const comm: <X extends L>(t: Tag) => Comm<X> =
        <X extends L>(t: Tag) =>
        async <L1 extends X, L2 extends X, T>(
          sender: L1,
          receiver: L2,
          value: MultiplyLocated<T, L1>
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
            return new MultiplyLocated<T, L2>(message, key);
          }
          return undefined as any;
        };

      const parallel: (t: Tag) => Parallel<L> =
        (t: Tag) =>
        async <const S extends L, T>(
          locations: S[],
          callback: <L1 extends S>(member: L1, unwrap: Unwrap<L1>) => Promise<T>
        ) => {
          t.comm();
          for (const loc of locations) {
            // @ts-ignore
            if (loc === this.target) {
              const ret = await callback(loc, (located) =>
                located.getValueAt(loc, key)
              );
              return new Faceted({ loc: ret }, key);
            }
          }
          return undefined as any;
        };

      const fanout: <S extends L>(t: Tag) => FanOut<S> =
        (t: Tag) => async (qs, c) => {
          const m: Record<string, any> = {};
          for (const q of qs) {
            const choreography = c(q);
            const located = await call(t)(choreography, undefined);
            if ((q as string) === (this.target as string)) {
              m[q] = located.getValueAt(q, key);
            }
          }
          return new Faceted(m, key);
        };

      const fanin: <S extends L>(t: Tag) => FanIn<S> =
        (t: Tag) => async (qs, rs, c) => {
          const m: Record<string, any> = {};
          for (const q of qs) {
            const choreography = c(q);
            const v = await call(t)(choreography, []);
            // @ts-ignore
            if (rs.includes(this.target)) {
              m[q] = v.getValueAt(q, key);
            }
          }
          return new Located(m as any, key);
        };

      const enclave: (t: Tag) => Enclave<L> =
        (t: Tag) =>
        async <LL extends L, Args, Return>(
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
                  enclave: enclave(childTag),
                  multicast: multicast(childTag),
                  broadcast: broadcast(childTag),
                  call: call(childTag),
                  naked: (v) => v.getValueAt(this.target as any, key),
                  parallel: parallel(childTag),
                  fanout: fanout<LL>(childTag),
                  fanin: fanin<LL>(childTag),
                }),
                args
              );
              return ret;
            }
            return undefined as any;
          });
        };

      const multicast: (t: Tag) => Multicast<L> =
        (t: Tag) =>
        async <L1 extends L, const LL extends L, T>(
          sender: L1,
          receivers: LL[],
          value: Located<T, L1> | MultiplyLocated<T, L1> | Faceted<T, L1>
        ) => {
          t.comm();

          // @ts-ignore
          if (this.target === sender) {
            // if sender, send value to all receivers
            const promises: Promise<any>[] = [];
            const v = value.getValueAt(sender, key);
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
            return new MultiplyLocated<T, LL | L1>(v, key);
            // @ts-ignore
          } else if (receivers.includes(this.target)) {
            const log = await logManager.read<T>(t.toJSON());
            if (log.ok) {
              return new MultiplyLocated<T, LL | L1>(log.value, key);
            }
            // if not sender, wait for value to be sent
            const message: T = await this.receiveTag(sender, this.target, t);
            await logManager.write(t.toJSON(), message);
            return new MultiplyLocated<T, LL | L1>(message, key);
          }
          return undefined as any;
        };

      const broadcast: (t: Tag) => Broadcast<L> =
        (t: Tag) =>
        async <S extends L, L1 extends L, T>(
          sender: L1,
          value: L1 extends S ? MultiplyLocated<T, S> : never
        ) => {
          t.comm();
          // @ts-ignore
          if (this.target === sender) {
            // if sender, broadcast value to all other locations
            const promises: Promise<any>[] = [];
            const v = value.getValueAt(sender, key);
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

      const call: (t: Tag) => Call<L> =
        (t: Tag) =>
        async <LL extends L, Args, Return>(
          c: Choreography<LL, Args, Return>,
          a: Args
        ) => {
          const childTag = t.call();
          const naked: Naked<LL> = <T>(cv: MultiplyLocated<T, LL>) =>
            cv.getValueAt(this.target as any, key);
          return await c(
            wrapMethods((m) => ctxManager.checkContext(m), {
              locally: locally(childTag),
              comm: comm(childTag),
              broadcast: broadcast(childTag),
              call: call(childTag),
              multicast: multicast(childTag),
              enclave: enclave(childTag),
              naked: naked,
              parallel: parallel(childTag),
              fanout: fanout(childTag),
              fanin: fanin(childTag),
            }),
            a
          );
        };

      const naked: Naked<L> = <S extends L, T>(cv: MultiplyLocated<T, S>) =>
        cv.getValueAt(this.target, key);
      const ret = await choreography(
        wrapMethods((m) => ctxManager.checkContext(m), {
          locally: locally(tag),
          comm: comm(tag),
          broadcast: broadcast(tag),
          call: call(tag),
          multicast: multicast(tag),
          enclave: enclave(tag),
          naked: naked,
          parallel: parallel(tag),
          fanout: fanout(tag),
          fanin: fanin(tag),
        }),
        args
      );
      return ret;
    };
  }
  public local<T>(value: T): MultiplyLocated<T, L1> {
    return new MultiplyLocated(value, this.key);
  }
  public remote<T, X extends Location>(
    _location: X
  ): X extends L1 ? never : MultiplyLocated<T, X> {
    return undefined as any;
  }
  public unwrap<T, S extends Location>(
    located: L1 extends S ? MultiplyLocated<T, S> : never
  ): T {
    return located.getValue(this.key);
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
  private key: symbol;
  constructor() {
    this.key = Symbol();
  }
  public compile<L extends Location, Args, Return>(
    choreography: Choreography<L, Args, Return>
  ): (args: Args) => Promise<Return> {
    return async (args) => {
      const key = this.key;
      const locally: Locally<L> = async <L1 extends L, T>(
        loc: L1,
        callback: (unwrap: Unwrap<L1>) => T | Promise<T>
      ) => {
        const retVal = await callback((located) =>
          located.getValueAt(loc, key)
        );
        let v: T;
        if (retVal instanceof Promise) {
          v = await retVal;
        } else {
          v = retVal;
        }
        return new MultiplyLocated(v, key);
      };
      const comm: Comm<L> = async <L1 extends L, L2 extends L, T>(
        sender: L1,
        _receiver: L2,
        value: MultiplyLocated<T, L1>
      ) => {
        return new MultiplyLocated(value.getValue(key), key);
      };
      const parallel: Parallel<L> = async <const S extends L, T>(
        locations: S[],
        callback: <L1 extends S>(member: L1, unwrap: Unwrap<L1>) => Promise<T>
      ) => {
        const obj: { [loc in S]: T } = {} as any;
        const promises = locations.map(async (loc) => {
          const ret = await callback(loc, (located) =>
            located.getValueAt(loc, key)
          );
          obj[loc] = ret;
        });
        await Promise.all(promises);
        return new Faceted(obj, key);
      };
      const fanout: <S extends L>() => FanOut<S> =
        <S extends L>() =>
        async <QS extends S, T>(
          locations: QS[],
          c: <Q extends QS>(
            loc: Q
          ) => Choreography<S, undefined, MultiplyLocated<T, QS>>
        ) => {
          const m: Record<string, T> = {};
          for (const q of locations) {
            const choreography = c(q);
            const v = await call(choreography, undefined);
            m[q] = v.getValueAt(q, key);
          }
          return new Faceted(m, key);
        };
      const fanin: <S extends L>() => FanIn<S> =
        <S extends L>() =>
        async <const QS extends S, const RS extends S, T>(
          participants: QS[],
          recipients: RS[],
          c: <Q extends QS>(
            loc: Q
          ) => Choreography<S, [], MultiplyLocated<T, RS>>
        ) => {
          const m: Record<string, T> = {};
          for (const q of participants) {
            const choreography = c(q);
            const v = await call(choreography, []);
            m[q] = v.getValueAt(q, key);
          }
          return new Located(m as any, key);
        };
      const enclave: Enclave<L> = async <LL extends L, Args, Return>(
        locations: LL[],
        choreography: Choreography<LL, Args, Return>,
        args: Args
      ) => {
        const naked: Naked<LL> = <T>(cv: MultiplyLocated<T, LL>) =>
          cv.getValue(key);
        const ret = await choreography(
          wrapMethods((m) => m, {
            locally: locally,
            comm: comm,
            enclave: enclave,
            multicast: multicast,
            broadcast: broadcast,
            call: call,
            naked: naked,
            parallel: parallel,
            fanout: fanout<LL>(),
            fanin: fanin<LL>(),
          }),
          args
        );
        return new MultiplyLocated(ret, key);
      };
      const multicast: Multicast<L> = async <
        L1 extends L,
        const LL extends L,
        T,
      >(
        _sender: L1,
        _receivers: LL[],
        value: Located<T, L1> | MultiplyLocated<T, L1> | Faceted<T, L1>
      ) => {
        return new MultiplyLocated(value.getValueAt(_sender, key), key);
      };
      const broadcast: Broadcast<L> = async <S extends L, L1 extends L, T>(
        _sender: L1,
        value: L1 extends S ? MultiplyLocated<T, S> : never
      ) => {
        return value.getValueAt(_sender, key);
      };
      const call: Call<L> = async <LL extends L, Args, Return>(
        c: Choreography<LL, Args, Return>,
        a: Args
      ) => {
        const naked: Naked<LL> = <T>(cv: MultiplyLocated<T, LL>) =>
          cv.getValue(key);
        const ret = await c(
          wrapMethods((m) => m, {
            locally: locally,
            comm: comm,
            broadcast: broadcast,
            call: call,
            multicast: multicast,
            enclave: enclave,
            naked: naked,
            parallel,
            fanout: fanout(),
            fanin: fanin(),
          }),
          a
        );
        return ret;
      };
      const naked: Naked<L> = <LL extends L, T>(cv: MultiplyLocated<T, LL>) =>
        cv.getValue(key);

      const ret = await choreography(
        {
          locally: locally,
          comm: comm,
          broadcast: broadcast,
          call: call,
          multicast: multicast,
          enclave: enclave,
          naked: naked,
          parallel: parallel,
          fanout: fanout(),
          fanin: fanin(),
        },
        args
      );
      return ret;
    };
  }
  public local<T, S extends Location>(value: T): MultiplyLocated<T, S> {
    return new MultiplyLocated(value, this.key);
  }
  public unwrap<T, S extends Location>(value: MultiplyLocated<T, S>): T {
    return value.getValue(this.key);
  }
}
