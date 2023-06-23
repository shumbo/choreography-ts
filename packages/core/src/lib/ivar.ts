type State<T> =
  | {
      isSet: false;
    }
  | {
      isSet: true;
      value: T;
    };

export class IVar<T = any> {
  private state: State<T> = { isSet: false };
  private resolvers: ((t: T) => void)[] = [];
  public write(value: T): void {
    if (this.state.isSet) {
      throw new Error("IVar already set");
    }
    this.state = { isSet: true, value };
    this.resolvers.forEach((resolve) => resolve(value));
  }
  public read(): Promise<T> {
    if (this.state.isSet) {
      return Promise.resolve(this.state.value);
    }
    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }
}
