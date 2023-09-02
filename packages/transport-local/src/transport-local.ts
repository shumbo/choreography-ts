import mitt, { Emitter } from "mitt";
import {
  Location,
  Parcel,
  Subscription,
  Transport,
} from "@choreography-ts/core";

export type LocalTransportChannel<L extends Location> = Emitter<{
  [L: Location]: Parcel<L>;
}>;

export class LocalTransport<L extends Location> extends Transport<L> {
  static createChannel<L extends Location>(): LocalTransportChannel<L> {
    return mitt();
  }
  constructor(
    private locs: readonly L[],
    private channel: LocalTransportChannel<L>
  ) {
    super();
  }
  get locations(): readonly L[] {
    return this.locs;
  }
  public async teardown(): Promise<void> {
    this.channel.all.clear();
  }
  public send(parcel: Parcel<L>): Promise<void> {
    this.channel.emit(parcel.to, parcel);
    return Promise.resolve();
  }
  public subscribe(target: L, cb: (p: Parcel<L>) => void): Subscription {
    this.channel.on(target, cb);
    return {
      remove: () => {
        this.channel.off(target, cb);
      },
    };
  }
}
