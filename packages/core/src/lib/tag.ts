export class Tag {
  private v: number[];
  constructor(_v?: number[]) {
    this.v = _v ?? [0];
  }
  private lastIndex() {
    return this.v.length - 1;
  }
  public comm(): void {
    this.v[this.lastIndex()]!++;
  }
  public call(): Tag {
    this.v[this.lastIndex()]!++;
    const child = new Tag([...this.v]);
    child.v.push(0);
    return child;
  }
  public toString(): string {
    return this.v.join(":");
  }
  public toJSON(): string {
    return JSON.stringify(this.v);
  }
}
