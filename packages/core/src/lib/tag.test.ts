import { Tag } from "./tag.js";

describe("Tag", () => {
  it("comm increments counter", () => {
    const t = new Tag();
    const s1 = t.toString();
    t.comm();
    const s2 = t.toString();
    expect(s1).not.toEqual(s2);
  });
  it("call creates a fork", () => {
    const t1 = new Tag();
    const t2 = t1.call();
    const s1 = t1.toString();
    const s2 = t2.toString();
    expect(s2.startsWith(s1)).toBe(true);
    expect(s1).not.toEqual(s2);
  });
  it("serialization", () => {
    const t = new Tag();
    const s = t.toJSON();
    const t2 = new Tag(JSON.parse(s));
    expect(t.toJSON()).toEqual(t2.toJSON());
  });
});
