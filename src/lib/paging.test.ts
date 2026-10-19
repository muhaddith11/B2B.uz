import { describe, expect, it } from "vitest";
import { cursorArgs, MAX_PAGE, pageOf, readOffset, readPage } from "./paging";

const url = (q: string) => new URL(`http://x/api?${q}`);

describe("sahifalash", () => {
  it("limit va kursorni o'qiydi, chegaradan oshirmaydi", () => {
    expect(readPage(url(""), 50)).toEqual({ limit: 50, cursor: null });
    expect(readPage(url("limit=20&cursor=abc"), 50)).toEqual({ limit: 20, cursor: "abc" });
    expect(readPage(url("limit=99999"), 50).limit).toBe(MAX_PAGE);
    expect(readPage(url("limit=-1"), 50).limit).toBe(50);
    expect(readPage(url("limit=abc"), 50).limit).toBe(50);
  });

  it("bitta ortiqcha yozuv so'raydi va keyingi kalitni shundan aniqlaydi", () => {
    expect(cursorArgs({ limit: 2, cursor: null })).toEqual({ take: 3 });
    expect(cursorArgs({ limit: 2, cursor: "c" })).toEqual({ take: 3, cursor: { id: "c" }, skip: 1 });
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(pageOf(rows, { limit: 2, cursor: null })).toEqual({ items: [{ id: "a" }, { id: "b" }], nextCursor: "b" });
    expect(pageOf(rows.slice(0, 2), { limit: 2, cursor: null })).toEqual({ items: [{ id: "a" }, { id: "b" }], nextCursor: null });
  });

  it("offset", () => {
    expect(readOffset(url("offset=100&limit=50"), 500)).toEqual({ limit: 50, offset: 100 });
    expect(readOffset(url("offset=-3"), 500)).toEqual({ limit: 500, offset: 0 });
  });
});
