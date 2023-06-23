export class DefaultDict<K, V> extends Map<K, V> {
  constructor(private defaultFactory: () => V) {
    super();
  }
  public get(key: K): V {
    if (!this.has(key)) {
      this.set(key, this.defaultFactory());
    }
    return super.get(key)!;
  }
}
