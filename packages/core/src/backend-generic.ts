/* eslint-disable @typescript-eslint/ban-ts-comment */

import {
  Backend,
  Broadcast,
  Call,
  Choreography,
  Colocally,
  Colocated,
  ColocatedContravariant,
  ColocatedCovariant,
  Comm,
  Locally,
  Located,
  LocatedElements,
  Location,
  Multicast,
  Peel,
  Unwrap,
} from "./core.js";
import { setEqual } from "./lib/set-equal.js";
import { Tag } from "./lib/tag.js";

/**
 * `GenericBackend` is a generic implementation of the `Backend` interface.
 * It assumes fully-connected communication between all locations.
 * It is intended to be used as a base class for other backends.
 * Because the same instance can be used for multiple choreographies, the backend instance must be stateless.
 *
 * @typeParam L the type of locations
 * @typeParam T the type of the backend instance
 */
export abstract class GenericBackend<L extends Location, T>
  implements Backend<L>
{
  /**
   * `setup` is called once before the choreography is executed.
   * It should return an instance of the backend which stores all the state needed to execute the choreography.
   * @param location the name of the location to perform the choreography at
   * @returns a promise that resolves the backend instance
   */
  abstract setup(location: L): Promise<T>;
  /**
   * `teardown` is called once after the choreography is executed.
   * It should clean up any resources used by the backend instance.
   * @param instance the backend instance returned by `setup`
   * @returns a promise that resolves when the backend instance is cleaned up
   */
  abstract teardown(instance: T): Promise<void>;
  /**
   * `send` is called to send a message from one location to another.
   * @param instance the backend instance returned by `setup`
   * @param sender the name of the location sending the message
   * @param receiver the name of the location receiving the message
   * @param data the message to send
   */
  abstract send(
    instance: T,
    sender: L,
    receiver: L,
    tag: Tag,
    data: any
  ): Promise<void>;
  /**
   * `receive` is called to receive a message from another location.
   * @param instance the backend instance returned by `setup`
   * @param sender the name of the location sending the message
   * @param receiver the name of the location receiving the message
   */
  abstract receive(instance: T, sender: L, receiver: L, tag: Tag): Promise<any>;

  /**
   * Initialize a new `GenericBackend` with a set of locations.
   * @param locations the set of locations
   */
  constructor(private locations: L[]) {}

  public epp<
    L1 extends L,
    Args extends (ColocatedCovariant<any, L> | Located<any, L>)[],
    Return extends (ColocatedCovariant<any, L> | Located<any, L>)[]
  >(
    choreography: Choreography<L, Args, Return>,
    location: L1
  ): (
    args: LocatedElements<L, L1, Args>
  ) => Promise<LocatedElements<L, L1, Return>> {
    return async (args) => {
      const instance = await this.setup(location);

      const tag = new Tag();
      const key = Symbol(location.toString());
      const ctxManager = new ContextManager<L>(this.locations);

      try {
        const locally: Locally<L> = async <L2 extends L, T>(
          loc: L2,
          callback: (unwrap: Unwrap<L2>) => T | Promise<T>
        ) => {
          // @ts-ignore - no easy way to type this
          if (loc !== location) {
            return undefined as any;
          }
          const retVal = callback((located) => located.getValue(key));
          let v: T;
          if (retVal instanceof Promise) {
            v = await retVal;
          } else {
            v = retVal;
          }
          return new Located(v, key);
        };

        const comm: (t: Tag) => Comm<L> =
          (t: Tag) =>
          async <L1 extends L, L2 extends L, T>(
            sender: L1,
            receiver: L2,
            value: Located<T, L1>
          ) => {
            t.comm();
            // @ts-ignore
            if (sender === receiver) {
              // if sender and receiver are the same, just return the value
              return value;
            }
            // @ts-ignore
            if (location === sender) {
              // if sender, send value to receiver
              await this.send(
                instance,
                sender,
                receiver,
                t,
                value.getValue(key)
              );
              return undefined as any;
            }
            // @ts-ignore
            if (location === receiver) {
              // if receiver, wait for value from sender and return
              const message: T = await this.receive(
                instance,
                sender,
                receiver,
                t
              );
              return new Located<T, L2>(message, key);
            }
            return undefined as any;
          };

        const colocally: (t: Tag) => Colocally<L> =
          (t: Tag) =>
          async <
            LL extends L,
            Args extends (ColocatedCovariant<any, LL> | Located<any, LL>)[],
            Return extends (ColocatedCovariant<any, LL> | Located<any, LL>)[]
          >(
            locations: LL[],
            choreography: Choreography<LL, Args, Return>,
            args: Args
          ) => {
            const childTag = t.call();
            return ctxManager.withContext(new Set(locations), async () => {
              // @ts-ignore
              if (locations.includes(location)) {
                const ret = await choreography(
                  wrapMethods((m) => ctxManager.checkContext(m), {
                    locally: locally,
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
            if (location === sender) {
              // if sender, send value to all receivers
              const promises: Promise<any>[] = [];
              const v = value.getValue(key);
              for (const receiver of receivers) {
                // @ts-ignore
                if (receiver !== sender) {
                  promises.push(this.send(instance, sender, receiver, t, v));
                }
              }
              await Promise.all(promises);
              return new Colocated<T, LL | L1>(v, key);
              // @ts-ignore
            } else if (receivers.includes(location)) {
              // if not sender, wait for value to be sent
              const message = await this.receive(instance, sender, location, t);
              return new Colocated<T, LL | L1>(message, key);
            }
            return undefined as any;
          };

        const broadcast: (t: Tag) => Broadcast<L> =
          (t: Tag) =>
          async <L1 extends L, T>(sender: L1, value: Located<T, L1>) => {
            t.comm();
            // @ts-ignore
            if (location === sender) {
              // if sender, broadcast value to all other locations
              const promises: Promise<any>[] = [];
              const v = value.getValue(key);
              const locations = ctxManager.getLocationsInContext();
              for (const receiver of locations) {
                // @ts-ignore
                if (receiver !== sender) {
                  promises.push(this.send(instance, sender, receiver, t, v));
                }
              }
              await Promise.all(promises);
              return v;
            } else {
              // if not sender, wait for value to arrive
              const data = await this.receive(instance, sender, location, t);
              return data;
            }
          };

        const peel: Peel<L> = <LL extends L, T>(
          cv: ColocatedContravariant<T, LL>
        ) => cv.getValue(key);

        const call: (t: Tag) => Call<L> =
          (t: Tag) =>
          async <
            LL extends L,
            Args extends (ColocatedCovariant<any, LL> | Located<any, LL>)[],
            Return extends (ColocatedCovariant<any, LL> | Located<any, LL>)[]
          >(
            c: Choreography<LL, Args, Return>,
            a: Args
          ) => {
            const childTag = t.call();
            return await c(
              wrapMethods((m) => ctxManager.checkContext(m), {
                locally: locally,
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
            locally: locally,
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
      } finally {
        await this.teardown(instance);
      }
    };
  }
}

class ContextManager<L extends Location> {
  private context: Set<L>;
  constructor(locations: L[]) {
    this.context = new Set(locations);
  }
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

/**
 * Given a wrapper function and a set of methods, wrap each method in the set with the wrapper function.
 * @param wrapper
 * @param methods
 * @returns a copy of the methods object with each method wrapped
 */
function wrapMethods<T extends Record<string, any>>(
  wrapper: (m: any) => any,
  methods: T
) {
  const copy = { ...methods };
  for (const [name, fn] of Object.entries(methods)) {
    (copy as any)[name] = wrapper(fn);
  }
  return copy;
}
