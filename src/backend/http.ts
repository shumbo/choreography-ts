import express from "express";
import { Server } from "http";
import fetch from "@adobe/node-fetch-retry";

import {
  Choreography,
  Backend,
  Locally,
  Located,
  Unwrap,
  Comm,
  Broadcast,
  Call,
  Location,
  LocatedElements,
  Dependencies,
  Peel,
  Colocally,
  Multicast,
  Colocated,
} from "../core";
import { Queue } from "../lib/queue";
import { setEqual } from "../lib/set-equal";

type Message<L> = {
  from: L;
  data: any;
};

type HttpConfig<L extends Location> = Record<L, [string, number]>;

export class HttpBackend<L extends Location> implements Backend<L> {
  constructor(private config: HttpConfig<L>) {}
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
      const [hostname, port] = this.config[location];
      const key = Symbol(location.toString());

      const ctxManager = new ContextManager<L>(this.config);

      const queue: Map<L, Queue> = new Map();
      for (const key in this.config) {
        queue.set(key, new Queue());
      }

      const app = express();
      app.use(express.json());
      app.post("/", (req, res) => {
        const msg: Message<L> = req.body;
        queue.get(msg.from)!.push(msg.data);
        res.status(200).send("OK");
      });
      const server = await startApplication(app, port, hostname);

      try {
        const locally: Locally<L> = async <L2 extends L, T>(
          loc: L2,
          callback: (unwrap: Unwrap<L2>) => T
        ) => {
          // TODO: Why?
          // @ts-ignore
          if (loc !== location) {
            return undefined as any;
          }
          return new Located(
            callback((located) => located.getValue(key)),
            key
          );
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
            const [hostname, port] = this.config[receiver];
            await fetch(`http://${hostname}:${port}`, {
              method: "POST",
              body: JSON.stringify({ from: sender, data: value.getValue(key) }),
              headers: { "Content-Type": "application/json" },
            });
            return undefined as any;
          }
          // @ts-ignore
          if (location === receiver) {
            // if receiver, wait for value from sender and return
            const message = await queue.get(sender)!.pop();
            return new Located<T, L2>(message, key);
          }
          return undefined as any;
        };

        const colocally: Colocally<L> = async <
          LL extends L,
          Return extends Located<any, LL>[]
        >(
          locations: LL[],
          callback: (
            deps: Dependencies<LL> & { peel: Peel<LL> }
          ) => Promise<Return>
        ) => {
          return ctxManager.withContext(new Set(locations), async () => {
            // @ts-ignore
            if (locations.includes(location)) {
              const ret = await callback(
                wrapMethods((m) => ctxManager.checkContext(m), {
                  locally: locally,
                  comm: comm,
                  colocally: colocally,
                  multicast: multicast,
                  broadcast: broadcast,
                  call: call,
                  peel: (v) => v.getValue(key),
                })
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
            for (const loc of receivers) {
              const [h, p] = this.config[loc];
              // @ts-ignore
              if (loc !== sender) {
                promises.push(
                  fetch(`http://${h}:${p}`, {
                    method: "POST",
                    body: JSON.stringify({ from: sender, data: v }),
                    headers: { "Content-Type": "application/json" },
                  })
                );
              }
            }
            await Promise.all(promises);
            return new Colocated<T, LL | L1>(v, key);
            // @ts-ignore
          } else if (receivers.includes(location)) {
            // if not sender, wait for value to be sent
            const message = await queue.get(sender)!.pop();
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
            for (const loc of locations) {
              const [h, p] = this.config[loc as L];
              // @ts-ignore
              if (loc !== sender) {
                promises.push(
                  fetch(`http://${h}:${p}`, {
                    method: "POST",
                    body: JSON.stringify({ from: sender, data: v }),
                    headers: { "Content-Type": "application/json" },
                  })
                );
              }
            }
            await Promise.all(promises);
            return v;
          } else {
            // if not sender, wait for value to arrive
            const data = await queue.get(sender)!.pop();
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
        // cleanups
        server.close();
      }
    };
  }
}

async function startApplication(
  app: express.Application,
  port: number,
  hostname: string
): Promise<Server> {
  return new Promise((resolve) => {
    const server = app.listen(port, hostname, () => {
      console.debug(`Listening on ${hostname}:${port}`);
      resolve(server);
    });
  });
}

class ContextManager<L extends Location> {
  private context: Set<L>;
  constructor(config: HttpConfig<L>) {
    this.context = new Set(Object.keys(config) as L[]);
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
