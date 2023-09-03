import fetch from "@adobe/node-fetch-retry";
import express from "express";
import { Server } from "http";
import bodyParser from "body-parser";

import {
  Location,
  Parcel,
  Subscription,
  Transport,
  Queue,
} from "@choreography-ts/core";
import { parcelFromJSON } from "@choreography-ts/core/dist/core";

export type HttpConfig<L extends Location> = Record<L, [string, number]>;

export class ExpressTransport<
  L extends Location,
  L1 extends L
> extends Transport<L, L1> {
  public static async create<L extends Location>(
    config: HttpConfig<L>,
    target: L
  ) {
    const queue: Queue<Parcel<L>> = new Queue();

    const [hostname, port] = config[target];
    const app = express();
    app.use(bodyParser.text({ type: "*/*" }));
    app.post("/", (req, res) => {
      const json: string = req.body;
      const parcel = parcelFromJSON<L>(json);
      queue.push(parcel);
      res.status(200).send("OK");
    });
    const server = await new Promise<Server>((resolve) => {
      const server = app.listen(port, hostname, () => {
        console.debug(`Listening on ${hostname}:${port}`);
        resolve(server);
      });
      app.on("error", console.error);
    });
    return new ExpressTransport(config, server, queue);
  }

  private constructor(
    private config: HttpConfig<L>,
    private server: Server,
    private queue: Queue<Parcel<L>>
  ) {
    super();
  }
  get locations(): readonly L[] {
    return Object.keys(this.config) as L[];
  }
  public async teardown(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err.toString());
        } else {
          resolve();
        }
      });
    });
  }
  public async send(parcel: Parcel<L>): Promise<void> {
    const [hostname, port] = this.config[parcel.to];
    await fetch(`http://${hostname}:${port}`, {
      method: "POST",
      body: JSON.stringify(parcel),
      headers: { "Content-Type": "application/json" },
    });
  }
  public subscribe(cb: (p: Parcel<L>) => void): Subscription {
    let resolver: () => void;
    const signal = new Promise<undefined>((resolve) => {
      resolver = () => resolve(undefined);
    });
    const process = async () => {
      for (;;) {
        const x = await Promise.race([signal, this.queue.pop()]);
        if (x === undefined) {
          break;
        }
        cb(x);
      }
    };
    process();
    return {
      remove: () => {
        resolver();
      },
    };
  }
}
