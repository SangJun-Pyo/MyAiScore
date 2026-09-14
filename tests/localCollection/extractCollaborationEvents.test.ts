import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseClaudeCodeSessionFile } from "../../src/server/localCollection/parseSessionFile.js";
import { extractCollaborationEvents } from "../../src/server/localCollection/extractCollaborationEvents.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "..", "..", "fixtures", "local-collection");

function load(name: string) {
  return parseClaudeCodeSessionFile(join(FIXTURES, name)).records;
}

test("basic session: extracts user messages, assistant text, tool calls (matched to results), and file touches", () => {
  const events = extractCollaborationEvents(load("basic-session.jsonl"));

  const userMessages = events.filter((e) => e.kind === "user_message");
  const assistantTexts = events.filter((e) => e.kind === "assistant_text");
  const toolCalls = events.filter((e) => e.kind === "tool_call");
  const fileTouches = events.filter((e) => e.kind === "file_touch");

  assert.equal(userMessages.length, 2);
  assert.ok(assistantTexts.length >= 2);
  assert.equal(toolCalls.length, 2);
  assert.equal(fileTouches.length, 1);
  assert.equal(fileTouches[0]!.path, "src/lib/validateOrderTotal.ts");

  const editCall = toolCalls.find((c) => c.toolName === "Edit")!;
  assert.equal(editCall.result.status, "tool_reported_ok");
  assert.equal(editCall.inputSummary.file_path, "src/lib/validateOrderTotal.ts");

  const bashCall = toolCalls.find((c) => c.toolName === "Bash")!;
  assert.equal(bashCall.result.status, "tool_reported_ok");
  // "npm test" matches the verification-command pattern -- but this is a
  // pattern guess, not proof the tests actually passed.
  assert.equal(bashCall.inferred.looksLikeVerificationCommand, true);
});

test("a tool_use with no matching tool_result anywhere in the transcript is 'no_result_found', never inferred as success", () => {
  const events = extractCollaborationEvents(load("unresolved-tool-session.jsonl"));
  const toolCalls = events.filter((e) => e.kind === "tool_call");
  assert.equal(toolCalls.length, 1);
  assert.equal(toolCalls[0]!.result.status, "no_result_found");
  assert.equal(toolCalls[0]!.result.resultTextExcerpt, undefined);
});

test("a verification-command guess (e.g. 'npm run build') that never resolved is still just no_result_found -- the guess never upgrades an unresolved call to any success/failure status", () => {
  const events = extractCollaborationEvents(load("unresolved-tool-session.jsonl"));
  const call = events.find((e) => e.kind === "tool_call")!;
  assert.equal(call.result.status, "no_result_found");
});

test("file paths tracked via file-history-delta are normalized to forward slashes", () => {
  const events = extractCollaborationEvents(load("outside-project-path-session.jsonl"));
  const touch = events.find((e) => e.kind === "file_touch")!;
  assert.equal(touch.path, "../../other-project/secrets.env");
});

test("prompt-injection text inside a tool_result is extracted as plain data -- no special handling, no branching on its content", () => {
  const events = extractCollaborationEvents(load("injection-session.jsonl"));
  const toolCall = events.find((e) => e.kind === "tool_call")!;
  assert.equal(toolCall.result.status, "tool_reported_ok");
  assert.match(toolCall.result.resultTextExcerpt ?? "", /SYSTEM OVERRIDE/);
  // The event's shape and fields are identical to any other tool_call -- the
  // extractor does not add an "instruction_detected" field or otherwise
  // change its behavior based on this text.
  assert.deepEqual(Object.keys(toolCall).sort(), ["inferred", "inputSummary", "kind", "result", "timestamp", "toolName", "toolUseId", "uuid"].sort());
});
