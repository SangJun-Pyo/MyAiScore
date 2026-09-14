import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('repository CLI example requires no API; default does not silently start live calls', () => {
  const example = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/evaluateRepository.ts', '--example'], { encoding: 'utf8', env: { ...process.env, MYAISCORE_ENABLE_LIVE: 'false' } });
  assert.equal(example.status, 0); assert.equal(JSON.parse(example.stdout).source, 'synthetic');
  const noConsent = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/evaluateRepository.ts', '--repo', 'https://github.com/example/project'], { encoding: 'utf8' });
  assert.equal(noConsent.status, 1); assert.equal(noConsent.stdout, ''); assert.equal(JSON.parse(noConsent.stderr).error, 'live_confirmation_required');
});
