/** Tests of `dashboard-activity`: commits parsed from `git log`, an entry touched only by a commit whose subject names it. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lastTouched, parseLog } from "./dashboard-activity.mjs";

const U = "\x1f";
const R = "\x1e";
const LOG = [
  `aaa${U}2026-10-08T10:00:00+02:00${U}BKLG-20 K9: the loincloth${U}Related: BKLG-052, BKLG-020.\n${R}`,
  `\nbbb${U}2026-10-07T10:00:00+02:00${U}docs: tidy${U}${R}`,
  `\nccc${U}2026-10-06T10:00:00+02:00${U}BKLG-052 G5 and BKLG-020${U}${R}\n`,
].join("");

test("each commit: hash, date, subject, the ids its subject names (zero-padded) and those only its body mentions", () => {
  const commits = parseLog(LOG);
  assert.deepEqual(commits.map((c) => [c.sha, c.ids, c.mentions]), [
    ["aaa", ["BKLG-020"], ["BKLG-052"]],
    ["bbb", [], []],
    ["ccc", ["BKLG-052", "BKLG-020"], []],
  ]);
  assert.equal(commits[0].subject, "BKLG-20 K9: the loincloth");
});

test("the last touch of an entry is the newest commit whose subject names it — a body mention is not one", () => {
  const last = lastTouched(parseLog(LOG));
  assert.equal(last.get("BKLG-020").sha, "aaa");
  assert.equal(last.get("BKLG-052").sha, "ccc");
  assert.equal(last.size, 2);
});

test("no output, no commits", () => {
  assert.deepEqual(parseLog(""), []);
});
