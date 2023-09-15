import { LogManager } from "./core.js";

/**
 * In-memory log manager stores logs in memory. Note that memory is not persisted and this should only be used for testing.
 */
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
