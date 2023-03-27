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
} from "../core";
import { Queue } from "../lib/queue";

type Message<L> = {
  from: L;
  data: any;
};

type HttpConfig<L extends string> = Record<L, [string, number]>;

export class HttpBackend<L extends string> implements Backend<L> {
  constructor(private config: HttpConfig<L>) {}
  public async run<L1 extends L>(
    choreography: Choreography<L, void>,
    location: L1
  ) {
    const [hostname, port] = this.config[location];
    const key = Symbol(location);

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

    // make dependencies
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

    const broadcast: Broadcast<L> = async <L1 extends L, T>(
      sender: L1,
      value: Located<T, L1>
    ) => {
      // @ts-ignore
      if (location === sender) {
        // if sender, broadcast value to all other locations
        const promises: Promise<any>[] = [];
        const v = value.getValue(key);
        for (const loc in this.config) {
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
        return v;
      } else {
        // if not sender, wait for value to arrive
        const data = await queue.get(sender)!.pop();
        return data;
      }
    };

    await choreography({ locally, comm, broadcast, call: undefined as any });

    server.close();
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
