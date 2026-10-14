#!/usr/bin/env node
// Cut a release: bump version, roll CHANGELOG [Unreleased] into a dated section,
// commit, and create an annotated vX.Y.Z tag. Never pushes. See docs/RELEASING.md.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const LEVELS = ['patch', 'minor', 'major'];
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const requested = args.find((a) => !a.startsWith('--'));

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const fail = (msg) => {
  console.error(`release: ${msg}`);
  process.exit(1);
};

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (branch !== 'master' && !dryRun) fail(`must be on master (on ${branch})`);
if (git('status', '--porcelain') && !dryRun) fail('working tree is not clean');

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const current = pkg.version;
if (!/^\d+\.\d+\.\d+$/.test(current ?? '')) fail(`package.json version "${current}" is not X.Y.Z`);

const changelog = readFileSync('CHANGELOG.md', 'utf8');
const match = changelog.match(/^## \[Unreleased\]\s*\n([\s\S]*?)(?=^## \[)/m);
if (!match) fail('CHANGELOG.md has no "## [Unreleased]" section followed by a release');
const notes = match[1].trim();
if (!notes.split('\n').some((l) => l.trim().startsWith('- '))) fail('[Unreleased] has no entries');

const inferred = /\*\*BREAKING:\*\*|^### Removed/m.test(notes)
  ? 'major'
  : /^### (Added|Deprecated)/m.test(notes)
    ? 'minor'
    : 'patch';

const [maj, min, pat] = current.split('.').map(Number);
const bump = (level) =>
  level === 'major' ? `${maj + 1}.0.0` : level === 'minor' ? `${maj}.${min + 1}.0` : `${maj}.${min}.${pat + 1}`;

let next;
if (!requested) {
  next = bump(inferred);
} else if (LEVELS.includes(requested)) {
  if (LEVELS.indexOf(requested) < LEVELS.indexOf(inferred))
    fail(`changelog requires at least a ${inferred} bump; "${requested}" is lower`);
  next = bump(requested);
} else if (/^\d+\.\d+\.\d+$/.test(requested)) {
  const cmp = (a, b) => a.split('.').map(Number).reduce((r, n, i) => r || n - b.split('.').map(Number)[i], 0);
  if (cmp(requested, bump(inferred)) < 0) fail(`${requested} is below the required ${inferred} bump (${bump(inferred)})`);
  next = requested;
} else {
  fail(`unknown argument "${requested}" (use major | minor | patch | X.Y.Z)`);
}

const tag = `v${next}`;
if (git('tag', '--list', tag)) fail(`tag ${tag} already exists`);

const date = new Date().toISOString().slice(0, 10);
const section = `## [${next}] - ${date}\n\n${notes}\n`;

console.log(`${current} -> ${next} (changelog implies ${inferred})\n\n${section}`);
if (dryRun) {
  console.log('dry run: nothing written');
  process.exit(0);
}

writeFileSync('CHANGELOG.md', changelog.replace(match[0], `## [Unreleased]\n\n${section}\n`));

const setVersion = (file, update) => {
  if (!existsSync(file)) return;
  const raw = readFileSync(file, 'utf8');
  const json = JSON.parse(raw);
  update(json);
  writeFileSync(file, JSON.stringify(json, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
};
setVersion('package.json', (j) => (j.version = next));
setVersion('package-lock.json', (j) => {
  j.version = next;
  if (j.packages?.['']) j.packages[''].version = next;
});

git('add', 'CHANGELOG.md', 'package.json', ...(existsSync('package-lock.json') ? ['package-lock.json'] : []));
git('commit', '-m', `Release ${tag}`);
git('tag', '-a', tag, '-m', `${tag}\n\n${notes}`);

console.log(`Created ${tag}. Not pushed. To publish: git push origin master --follow-tags`);
