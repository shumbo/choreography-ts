import { DefaultDict, GenericBackend, IVar, Location, Tag } from ".";
import mitt from "mitt";

export type LocalBackendInstance<L extends Location> = {
  location: L;
  inbox: DefaultDict<string, IVar>;
};

type Message<L extends Location> = {
  from: L;
  tag: string;
  data: any;
};

export type LocalBackendConfig<L extends Location> = Record<L, [string]>;

function key(location: string, tag: string): string {
  return `${location}:${tag}`;
}

export class LocalBackend<L extends Location> extends GenericBackend<
  L,
  LocalBackendInstance<L>
> {
  private readonly m = mitt<{ [l: Location]: Message<Location> }>();
  constructor(config: LocalBackendConfig<L>) {
    super(Object.keys(config) as L[]);
  }
  async setup(location: L): Promise<LocalBackendInstance<L>> {
    const inbox = new DefaultDict<string, IVar>(() => new IVar());
    this.m.on(location, (msg) => {
      inbox.get(key(msg.from, msg.tag)).write(msg.data);
    });
    return { location, inbox };
  }
  async teardown(instance: LocalBackendInstance<L>): Promise<void> {
    // noop
    this.m.off(instance.location);
    return;
  }
  async send(
    _instance: LocalBackendInstance<L>,
    sender: L,
    receiver: L,
    tag: Tag,
    data: any
  ): Promise<void> {
    const msg: Message<L> = { from: sender, tag: tag.toString(), data: data };
    this.m.emit(receiver, msg);
  }
  async receive(
    instance: LocalBackendInstance<L>,
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
