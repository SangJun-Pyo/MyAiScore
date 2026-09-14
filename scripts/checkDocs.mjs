// Validate active Markdown links and the Development/Sessions placement rule.
// Run from the project root: node scripts/checkDocs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? markdownFiles(full) : entry.name.endsWith('.md') ? [full] : [];
  });
}
const files = [
  ...fs.readdirSync(root).filter(name => name.endsWith('.md')).map(name => path.join(root, name)),
  ...markdownFiles(path.join(root, 'docs')),
];
const problems = [];
const tracked = process.argv.includes('--tracked')
  ? new Set(execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean))
  : null;
let localLinks = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
    const local = decodeURIComponent(target.split('#')[0]);
    if (!local) continue;
    localLinks++;
    const resolved = path.resolve(path.dirname(file), local);
    if (!fs.existsSync(resolved)) {
      problems.push(`${path.relative(root, file)}: missing ${target}`);
    } else if (tracked) {
      const relative = path.relative(root, resolved).split(path.sep).join('/');
      if (!tracked.has(relative) && ![...tracked].some(name => name.startsWith(relative + '/'))) {
        problems.push(`${path.relative(root, file)}: link target not in Git: ${target}`);
      }
    }
  }
}
const dev = path.join(root, 'docs', 'Development');
for (const name of fs.readdirSync(dev)) {
  if (/\.(md)$/i.test(name) && /(?:REPORT|REVIEW|FOLLOWUP)/i.test(name)) {
    problems.push(`docs/Development/${name}: put phase reports/reviews in the relevant Sessions/Phase-*.md`);
  }
}
console.log(JSON.stringify({ files: files.length, localLinks, problems }, null, 2));
if (problems.length) process.exitCode = 1;
