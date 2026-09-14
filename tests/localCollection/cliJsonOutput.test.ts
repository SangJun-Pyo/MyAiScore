/**
 * Regression tests for MAS-006 (Astra independent review of
 * claude/local-collection-poc@5978210): `scripts/collectLocalSession.ts
 * --json` serialized the internal `LocalCollectionResult` wholesale,
 * including the raw `events` array -- which carries session text BEFORE
 * redactSecrets/truncation (that safety only ever applied to
 * `conversion.analysisContext`, not to `events`). A secret embedded in a
 * local session leaked into --json output verbatim.
 *
 * These tests run the actual CLI as a child process (not just the library
 * function) so they catch exactly what MAS-006 found -- a bug in the CLI's
 * own serialization choice, not in the underlying collection functions.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const FIXTURES = join(ROOT, "fixtures", "local-collection");
const CLI = join(ROOT, "scripts", "collectLocalSession.ts");
const SECRET = "sk-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function runCli(args: string[]): { stdout: string; stderr: string; status: number } {
  // Invoke via `node --import tsx <script>` directly (not `npx tsx`) --
  // npx resolves to a .cmd/.ps1 shim on Windows that execFileSync cannot
  // run without a shell, which fails silently (status:null). This matches
  // how this repo's own npm scripts already invoke tsx (see package.json's
  // "test" script), so it's also a more faithful reproduction of how the
  // CLI actually runs.
  try {
    const stdout = execFileSync(process.execPath, ["--import", "tsx", CLI, ...args], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { stdout, stderr: "", status: 0 };
  } catch (err) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number | null };
    return { stdout: e.stdout?.toString() ?? "", stderr: e.stderr?.toString() ?? "", status: e.status ?? 1 };
  }
}

test("MAS-006 regression: --json output never contains the raw, unmasked secret from the session", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-mas006-"));
  try {
    const { stdout, stderr, status } = runCli(["--project", projectRoot, "--session", join(FIXTURES, "secrets-session.jsonl"), "--json"]);
    assert.equal(status, 0);
    assert.ok(!stdout.includes(SECRET), "stdout must never contain the raw secret");
    assert.ok(!stderr.includes(SECRET), "stderr must never contain the raw secret");

    const parsed = JSON.parse(stdout);
    // The public view must not carry a raw, unmasked events array at all.
    assert.equal("events" in parsed, false, "the public --json view must not expose the raw internal events array");
    assert.equal("analysisContext" in parsed, false, "the public --json view must not expose analysisContext either -- same disclosure boundary as the human preview");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("MAS-006 regression: the default human-readable preview also never contains the raw secret (baseline, was already safe)", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-mas006-"));
  try {
    const { stdout, status } = runCli(["--project", projectRoot, "--session", join(FIXTURES, "secrets-session.jsonl")]);
    assert.equal(status, 0);
    assert.ok(!stdout.includes(SECRET));
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("--json output preserves the structure a consumer needs: typeCounts, fileConnections, evidence (masked), excluded, maskedEvidenceIds", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-mas006-"));
  try {
    const { stdout, status } = runCli(["--project", projectRoot, "--session", join(FIXTURES, "basic-session.jsonl"), "--json"]);
    assert.equal(status, 0);
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.recordTypeCounts);
    assert.ok(Array.isArray(parsed.fileConnections));
    assert.ok(Array.isArray(parsed.evidence) && parsed.evidence.length > 0);
    assert.ok(Array.isArray(parsed.excluded));
    assert.ok(Array.isArray(parsed.maskedEvidenceIds));
    for (const e of parsed.evidence) {
      assert.equal(e.sourceType, "user_provided_excerpt");
      assert.ok(e.summary.length <= 120, "evidence summary must stay a short masked preview, not full text");
    }
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("an unsupported-format session (error path) never leaks anything secret-shaped in stdout/stderr either", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-mas006-"));
  try {
    const { stdout, stderr, status } = runCli(["--project", projectRoot, "--session", join(FIXTURES, "unsupported-format.jsonl"), "--json"]);
    assert.equal(status, 1);
    assert.ok(!stdout.includes(SECRET) && !stderr.includes(SECRET));
    assert.doesNotMatch(stderr, /sk-[A-Za-z0-9]{10,}/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});


test("MAS-006 diagnostics do not echo malformed JSON or unknown record type text", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-mas006-diagnostics-"));
  const path = join(projectRoot, "synthetic.jsonl");
  const diagnosticSecret = "sk-SYNTHETIC_SECRET";
  try {
    writeFileSync(path, [
      JSON.stringify({ type: "user", uuid: "synthetic", timestamp: "2026-09-14T00:00:00Z", message: { content: "safe" } }),
      diagnosticSecret,
      JSON.stringify({ type: SECRET }),
    ].join("\n"));
    for (const mode of [[], ["--json"]]) {
      const result = runCli(["--project", projectRoot, "--session", path, ...mode]);
      assert.equal(result.status, 0);
      assert.ok(!result.stdout.includes(diagnosticSecret));
      assert.ok(!result.stderr.includes(diagnosticSecret));
      assert.ok(!result.stdout.includes(SECRET));
      assert.ok(!result.stderr.includes(SECRET));
      if (mode.length) {
        const view = JSON.parse(result.stdout);
        assert.deepEqual(view.malformedLines, [{ lineNumber: 2, reason: "invalid JSON" }]);
        assert.equal(view.recordTypeCounts.unknown, 1);
        assert.equal(view.recordTypeCounts.user, 1);
      }
    }
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});


test("public preview masks secret-bearing metadata and rejects non-date eventTime", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "myaiscore-mas006-metadata-"));
  const path = join(projectRoot, "synthetic.jsonl");
  try {
    writeFileSync(path, [
      JSON.stringify({ type: "assistant", uuid: "synthetic", timestamp: SECRET, message: { content: [
        { type: "tool_use", id: "tool1", name: SECRET, input: {} },
      ] } }),
      JSON.stringify({ type: "file-history-delta", timestamp: "2026-09-14T00:00:00Z", trackingPath: `${SECRET}.ts` }),
    ].join("\n"));
    for (const mode of [[], ["--json"]]) {
      const result = runCli(["--project", projectRoot, "--session", path, ...mode]);
      assert.equal(result.status, 0);
      assert.ok(!result.stdout.includes(SECRET), "secret-bearing tool name/path/date must not bypass masking");
      assert.ok(!result.stderr.includes(SECRET));
      if (mode.length) {
        const view = JSON.parse(result.stdout);
        assert.equal(view.evidence[0].eventTime, null);
        assert.equal(view.evidence[1].eventTime, "2026-09-14T00:00:00Z");
        assert.ok(view.fileConnections.length === 1);
      }
    }
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
