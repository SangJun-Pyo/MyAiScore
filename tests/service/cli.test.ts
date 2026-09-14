import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('repository CLI example requires no API; default does not silently start live calls', () => {
  const example = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/evaluateRepository.ts', '--example'], { encoding: 'utf8', env: { ...process.env, MYAISCORE_ENABLE_LIVE: 'false' } });
  assert.equal(example.status, 0); assert.equal(JSON.parse(example.stdout).source, 'synthetic');
  const noConsent = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/evaluateRepository.ts', '--repo', 'https://github.com/example/project'], { encoding: 'utf8' });
  assert.equal(noConsent.status, 1); assert.equal(noConsent.stdout, ''); assert.equal(JSON.parse(noConsent.stderr).error, 'live_confirmation_required');
});
test('output destination errors precede live configuration and preserve existing files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'myaiscore-output-check-'));
  try {
    const existing = join(directory, 'existing.json');
    writeFileSync(existing, 'keep this existing file');
    const cases = [
      { path: join(directory, 'missing-parent', 'result.json'), code: 'output_unavailable' },
      { path: existing, code: 'output_exists' },
      { path: join(existing, 'result.json'), code: 'output_unavailable' },
    ];
    for (const entry of cases) {
      const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/evaluateRepository.ts', '--live', '--repo', 'https://github.com/example/project', '--out', entry.path], {
        encoding: 'utf8', env: { ...process.env, MYAISCORE_ENABLE_LIVE: 'false', ANTHROPIC_API_KEY: '', ANTHROPIC_MODEL: '' },
      });
      assert.equal(result.status, 1); assert.equal(result.stdout, '');
      assert.equal(JSON.parse(result.stderr).error, entry.code);
      assert.ok(!result.stderr.includes(directory), 'errors must not print local paths');
      assert.equal(readFileSync(existing, 'utf8'), 'keep this existing file');
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('example can write a new output file and refuses a later overwrite', () => {
  const directory = mkdtempSync(join(tmpdir(), 'myaiscore-output-example-'));
  try {
    const target = join(directory, 'result.json');
    const args = ['--import', 'tsx', 'scripts/evaluateRepository.ts', '--example', '--out', target];
    const first = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(first.status, 0); assert.equal(first.stdout, '');
    const saved = readFileSync(target, 'utf8'); assert.equal(JSON.parse(saved).source, 'synthetic');
    const second = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(second.status, 1); assert.equal(JSON.parse(second.stderr).error, 'output_exists');
    assert.equal(readFileSync(target, 'utf8'), saved);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
