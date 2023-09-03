import mitt, { Emitter } from "mitt";
import { Location, Parcel, Subscription, Transport } from "./core";

export type LocalTransportChannel<L extends Location> = {
  emitter: Emitter<{
    [L: Location]: Parcel<L>;
  }>;
  locations: readonly L[];
};

export class LocalTransport<L extends Location, L1 extends L> extends Transport<
  L,
  L1
> {
  static createChannel<L extends Location>(
    locations: readonly L[]
  ): LocalTransportChannel<L> {
    return { emitter: mitt(), locations };
  }
  constructor(
    private locs: readonly L[],
    private target: L1,
    private channel: LocalTransportChannel<L>
  ) {
    super();
  }
  get locations(): readonly L[] {
    return this.locs;
  }
  public async teardown(): Promise<void> {
    this.channel.emitter.all.clear();
  }
  public send(parcel: Parcel<L>): Promise<void> {
    this.channel.emitter.emit(parcel.to, parcel);
    return Promise.resolve();
  }
  public subscribe(cb: (p: Parcel<L>) => void): Subscription {
    this.channel.emitter.on(this.target, cb);
    return {
      remove: () => {
        this.channel.emitter.off(this.target, cb);
      },
    };
  }
}
