import {
  Backend,
  Broadcast,
  Call,
  Choreography,
  Colocally,
  Colocated,
  Comm,
  Locally,
  Located,
  LocatedElements,
  Location,
  Multicast,
  Peel,
  Unwrap,
} from "../core";
import { setEqual } from "../lib/set-equal";

export interface GenericChannel<L extends Location> {
  send(sender: L, receiver: L, data: any): Promise<void>;
  receive(sender: L, receiver: L): Promise<any>;
}

export abstract class GenericBackend<L extends Location, T>
  implements Backend<L>
{
  abstract setup(location: L): Promise<T>;
  abstract teardown(instance: T): Promise<void>;
  abstract send(instance: T, sender: L, receiver: L, data: any): Promise<void>;
  abstract receive(instance: T, sender: L, receiver: L): Promise<any>;

  constructor(private locations: L[]) {}

  public epp<
    L1 extends L,
    Args extends Located<any, L>[],
    Return extends Located<any, L>[]
  >(
    choreography: Choreography<L, Args, Return>,
    location: L1
  ): (
    args: LocatedElements<L, L1, Args>
  ) => Promise<LocatedElements<L, L1, Return>> {
    return async (args) => {
      const instance = await this.setup(location);

      const key = Symbol(location.toString());
      const ctxManager = new ContextManager<L>(this.locations);

      try {
        const locally: Locally<L> = async <L2 extends L, T>(
          loc: L2,
          callback: (unwrap: Unwrap<L2>) => T | Promise<T>
        ) => {
          // @ts-ignore
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

        const comm: Comm<L> = async <L1 extends L, L2 extends L, T>(
          sender: L1,
          receiver: L2,
          value: Located<T, L1>
        ) => {
          // @ts-ignore
          if (sender === receiver) {
            // if sender and receiver are the same, just return the value
            return value;
          }
          // @ts-ignore
          if (location === sender) {
            // if sender, send value to receiver
            await this.send(instance, sender, receiver, value.getValue(key));
            return undefined as any;
          }
          // @ts-ignore
          if (location === receiver) {
            // if receiver, wait for value from sender and return
            const message: T = await this.receive(instance, sender, receiver);
            return new Located<T, L2>(message, key);
          }
          return undefined as any;
        };

        const colocally: Colocally<L> = async <
          LL extends L,
          Args extends Located<any, LL>[],
          Return extends Located<any, LL>[]
        >(
          locations: LL[],
          choreography: Choreography<LL, Args, Return>,
          args: Args
        ) => {
          return ctxManager.withContext(new Set(locations), async () => {
            // @ts-ignore
            if (locations.includes(location)) {
              const ret = await choreography(
                wrapMethods((m) => ctxManager.checkContext(m), {
                  locally: locally,
                  comm: comm,
                  colocally: colocally,
                  multicast: multicast,
                  broadcast: broadcast,
                  call: call,
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

        const multicast: Multicast<L> = async <
          L1 extends L,
          const LL extends L,
          T
        >(
          sender: L1,
          receivers: LL[],
          value: Located<T, L1>
        ) => {
          const locations: (LL | L1)[] = [sender, ...receivers];
          // @ts-ignore
          if (location === sender) {
            // if sender, send value to all receivers
            const promises: Promise<any>[] = [];
            const v = value.getValue(key);
            for (const receiver of receivers) {
              // @ts-ignore
              if (receiver !== sender) {
                promises.push(this.send(instance, sender, receiver, v));
              }
            }
            await Promise.all(promises);
            return new Colocated<T, LL | L1>(v, key);
            // @ts-ignore
          } else if (receivers.includes(location)) {
            // if not sender, wait for value to be sent
            const message = await this.receive(instance, sender, location);
            return new Colocated<T, LL | L1>(message, key);
          }
          return undefined as any;
        };

        const broadcast: Broadcast<L> = async <L1 extends L, T>(
          sender: L1,
          value: Located<T, L1>
        ) => {
          // @ts-ignore
          if (location === sender) {
            // if sender, broadcast value to all other locations
            const promises: Promise<any>[] = [];
            const v = value.getValue(key);
            const locations = ctxManager.getLocationsInContext();
            for (const receiver of locations) {
              // @ts-ignore
              if (receiver !== sender) {
                promises.push(this.send(instance, sender, receiver, v));
              }
            }
            await Promise.all(promises);
            return v;
          } else {
            // if not sender, wait for value to arrive
            const data = await this.receive(instance, sender, location);
            return data;
          }
        };

        const peel: Peel<L> = <LL extends L, T>(cv: Colocated<T, LL>) =>
          cv.getValue(key);

        const call: Call<L> = async <
          LL extends L,
          Args extends Located<any, LL>[],
          Return extends Located<any, LL>[]
        >(
          c: Choreography<LL, Args, Return>,
          a: Args
        ) => {
          return await c(
            wrapMethods((m) => ctxManager.checkContext(m), {
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
        };
        const ret = await choreography(
          wrapMethods((m) => ctxManager.checkContext(m), {
            locally: locally,
            comm: comm,
            broadcast: broadcast,
            call: call,
            multicast: multicast,
            colocally: colocally,
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
