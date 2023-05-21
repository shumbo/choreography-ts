import fetch from "@adobe/node-fetch-retry";
import express from "express";
import { Server } from "http";

import { Location } from "../core";
import { Queue } from "../lib/queue";
import { GenericBackend } from "./generic";

type HttpServerInstance<L> = {
  location: L;
  app: express.Application;
  server: Server;
  inbox: Map<L, Queue>;
};

type Message<L> = {
  from: L;
  data: any;
};

type HttpConfig<L extends Location> = Record<L, [string, number]>;

export class HttpBackend<L extends Location> extends GenericBackend<
  L,
  HttpServerInstance<L>
> {
  constructor(private config: HttpConfig<L>) {
    super(Object.keys(config) as L[]);
  }

  public async setup(location: L): Promise<HttpServerInstance<L>> {
    const inbox = new Map<L, Queue>();
    for (const key in this.config) {
      inbox.set(key as L, new Queue());
    }
    const [hostname, port] = this.config[location];
    const app = express();
    app.use(express.json());
    app.post("/", (req, res) => {
      const msg: Message<L> = req.body;
      inbox.get(msg.from)!.push(msg.data);
      res.status(200).send("OK");
    });
    const server = await new Promise<Server>((resolve) => {
      const server = app.listen(port, hostname, () => {
        console.debug(`Listening on ${hostname}:${port}`);
        resolve(server);
      });
    });
    return { location, app, server, inbox };
  }

  public async teardown(instance: HttpServerInstance<L>): Promise<void> {
    return new Promise((resolve, reject) => {
      instance.server.close((err) => {
        if (err) {
          reject(err.toString());
        } else {
          resolve();
        }
      });
    });
  }

  public async send(
    _: HttpServerInstance<L>,
    sender: L,
    receiver: L,
    data: any
  ): Promise<void> {
    const [hostname, port] = this.config[receiver];
    const msg: Message<L> = { from: sender, data: data };
    await fetch(`http://${hostname}:${port}`, {
      method: "POST",
      body: JSON.stringify(msg),
      headers: { "Content-Type": "application/json" },
    });
  }

  public async receive(
    instance: HttpServerInstance<L>,
    sender: L,
    _receiver: L
  ): Promise<any> {
    return await instance.inbox.get(sender)!.pop();
  }
}
