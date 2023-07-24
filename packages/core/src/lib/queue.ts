/**
 * A queue that can be used to wait for a value to be pushed.
 */
export class Queue<T = any> {
  private queue: T[] = [];
  private waiting: ((v: T) => void)[] = [];
  public push(value: T): void {
    if (this.waiting.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.waiting.shift()!(value);
    } else {
      this.queue.push(value);
    }
  }
  public async pop(): Promise<T> {
    if (this.queue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.queue.shift()!;
    } else {
      return new Promise((resolve) => {
        this.waiting.push(resolve);
      });
    }
  }
}
