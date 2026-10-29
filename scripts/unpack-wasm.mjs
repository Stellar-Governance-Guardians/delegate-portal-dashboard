import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Unpack the pinned parser WASM release asset into generated/wasm/{web,nodejs}.
 *
 * - Verifies sha256 against parser.lock FIRST (fail closed on drift).
 * - Generated output is gitignored; it is rebuilt from the committed vendored
 *   tarball on every dev/build/test run, so a clean clone needs no network.
 * - The nodejs target is used by Vitest; the web target by the browser page.
 */

const root = new URL('..', import.meta.url).pathname;
const lock = JSON.parse(readFileSync(join(root, 'parser.lock'), 'utf8'));
const assetName = new URL(lock.assetUrl).pathname.split('/').pop();
const tarball = join(root, 'vendor', assetName);

const actual = createHash('sha256').update(readFileSync(tarball)).digest('hex');
if (actual !== lock.sha256) {
  console.error(
    `unpack-wasm: ${assetName} sha256 ${actual} does not match parser.lock ${lock.sha256} — refusing to unpack`,
  );
  process.exit(1);
}

const out = join(root, 'generated', 'wasm');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// npm-pack style tarball: one root directory containing nodejs/ and web/.
const extractDir = mkdtempSync(join(tmpdir(), 'sgg-wasm-'));
try {
  execFileSync('tar', ['-xzf', tarball, '-C', extractDir], { stdio: 'pipe' });
  const rootDir = execFileSync('ls', [extractDir], { encoding: 'utf8' }).trim();
  const assetRoot = join(extractDir, rootDir);
  for (const target of ['nodejs', 'web']) {
    const src = join(assetRoot, target);
    if (!existsSync(src)) {
      console.error(`unpack-wasm: release asset is missing the ${target} target`);
      process.exit(1);
    }
    cpSync(src, join(out, target), { recursive: true });
  }
} finally {
  rmSync(extractDir, { recursive: true, force: true });
}

console.log(`unpack-wasm: ${lock.version} (${lock.sha256.slice(0, 12)}…) → generated/wasm/{web,nodejs}`);
