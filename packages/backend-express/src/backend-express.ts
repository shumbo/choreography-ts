/* eslint-disable @typescript-eslint/no-explicit-any */

import fetch from "@adobe/node-fetch-retry";
import express from "express";
import { Server } from "http";
import {
  Location,
  GenericBackend,
  Tag,
  DefaultDict,
  IVar,
} from "@choreography-ts/core";

type HttpServerInstance<L> = {
  location: L;
  app: express.Application;
  server: Server;
  inbox: DefaultDict<string, IVar>;
};

type Message<L extends Location> = {
  from: L;
  tag: string;
  data: any;
};

type HttpConfig<L extends Location> = Record<L, [string, number]>;

function key(location: string, tagString: string): string {
  return `${location}:${tagString}`;
}

export class ExpressBackend<L extends Location> extends GenericBackend<
  L,
  HttpServerInstance<L>
> {
  constructor(private config: HttpConfig<L>) {
    super(Object.keys(config) as L[]);
  }

  public async setup(location: L): Promise<HttpServerInstance<L>> {
    const inbox = new DefaultDict<string, IVar>(() => new IVar());
    const [hostname, port] = this.config[location];
    const app = express();
    app.use(express.json());
    app.post("/", (req, res) => {
      const msg: Message<L> = req.body;
      inbox.get(key(msg.from, msg.tag)).write(msg.data);
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
    tag: Tag,
    data: any
  ): Promise<void> {
    const [hostname, port] = this.config[receiver];
    const msg: Message<L> = { from: sender, tag: tag.toString(), data: data };
    await fetch(`http://${hostname}:${port}`, {
      method: "POST",
      body: JSON.stringify(msg),
      headers: { "Content-Type": "application/json" },
    });
  }

  public async receive(
    instance: HttpServerInstance<L>,
    sender: L,
    _receiver: L,
    tag: Tag
  ): Promise<any> {
    const k = key(sender, tag.toString());
    const v = await instance.inbox.get(k).read();
    instance.inbox.delete(k);
    return v;
  }
}
