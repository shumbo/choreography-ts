import { LogManager } from "./core.js";

export class InMemoryLogManager implements LogManager {
  private dict: Record<string, string> = {};
  async write<T>(lid: string, data: T): Promise<void> {
    this.dict[lid] = JSON.stringify(data);
  }
  async read<T>(lid: string): Promise<{ ok: true; value: T } | { ok: false }> {
    const s = this.dict[lid];
    if (s === undefined) {
      return { ok: false };
    }
    return { ok: true, value: JSON.parse(s) };
  }
}
