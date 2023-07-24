export class DefaultDict<K, V> extends Map<K, V> {
  constructor(private defaultFactory: () => V) {
    super();
  }
  public get(key: K): V {
    if (!this.has(key)) {
      this.set(key, this.defaultFactory());
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return super.get(key)!;
  }
}
