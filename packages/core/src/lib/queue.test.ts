import { Queue } from "./queue.js";

describe("Queue", () => {
  test("push-pop", async () => {
    const queue = new Queue<number>();
    queue.push(1);
    queue.push(2);
    queue.push(3);
    expect(await queue.pop()).toBe(1);
    expect(await queue.pop()).toBe(2);
    expect(await queue.pop()).toBe(3);
  });
  test("wait", async () => {
    const queue = new Queue<number>();
    const promise = queue.pop();
    queue.push(1);
    expect(await promise).toBe(1);
  });
  test("interleave", async () => {
    const queue = new Queue<number>();
    queue.push(1);
    expect(await queue.pop()).toBe(1);
    const two = queue.pop();
    queue.push(2);
    queue.push(3);
    expect(await two).toBe(2);
    expect(await queue.pop()).toBe(3);
  });
});
