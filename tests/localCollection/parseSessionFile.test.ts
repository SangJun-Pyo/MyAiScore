import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseClaudeCodeSessionFile, SessionParseError } from "../../src/server/localCollection/parseSessionFile.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "..", "..", "fixtures", "local-collection");

test("parses a well-formed basic session and counts record types", () => {
  const result = parseClaudeCodeSessionFile(join(FIXTURES, "basic-session.jsonl"));
  assert.equal(result.malformedLines.length, 0);
  assert.ok((result.typeCounts.user ?? 0) >= 1);
  assert.ok((result.typeCounts.assistant ?? 0) >= 1);
  assert.ok((result.typeCounts["file-history-delta"] ?? 0) >= 1);
});

test("a missing file throws SessionParseError(file_not_found)", () => {
  assert.throws(
    () => parseClaudeCodeSessionFile(join(FIXTURES, "does-not-exist.jsonl")),
    (err: unknown) => err instanceof SessionParseError && err.code === "file_not_found",
  );
});

test("corrupted lines are skipped and reported, not thrown -- the rest of the file still parses", () => {
  const result = parseClaudeCodeSessionFile(join(FIXTURES, "corrupted-session.jsonl"));
  assert.ok(result.malformedLines.length >= 2, "both the invalid-JSON line and the no-'type' line should be reported");
  assert.ok(result.records.length >= 2, "the valid user/assistant lines should still be parsed");
});

test("a file with no recognizable session record type at all is an explicit unsupported_format error", () => {
  assert.throws(
    () => parseClaudeCodeSessionFile(join(FIXTURES, "unsupported-format.jsonl")),
    (err: unknown) => err instanceof SessionParseError && err.code === "unsupported_format",
  );
});
