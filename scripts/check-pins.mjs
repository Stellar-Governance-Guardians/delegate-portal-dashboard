import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * Offline pin check (PR gate, D1). Fails loud on drift: the vendored parser
 * WASM tarball and the vendored GraphQL SDL must hash exactly as their lock
 * files say. Never touches the network — the nightly workflow owns
 * "the pinned URL still resolves".
 */

const root = new URL('..', import.meta.url);

function readJson(rel) {
  return JSON.parse(readFileSync(new URL(rel, root), 'utf8'));
}

function sha256(rel) {
  return createHash('sha256').update(readFileSync(new URL(rel, root))).digest('hex');
}

const failures = [];

const parserLock = readJson('parser.lock');
const wasmPath = `vendor/${new URL(parserLock.assetUrl).pathname.split('/').pop()}`;
const wasmSha = sha256(wasmPath);
if (wasmSha !== parserLock.sha256) {
  failures.push(`parser.lock: ${wasmPath} sha256 ${wasmSha} != pinned ${parserLock.sha256}`);
} else {
  console.log(`ok parser-wasm ${parserLock.version} (${wasmSha})`);
}

const schemaLock = readJson('schema.lock');
const schemaSha = sha256('schema/governance-v1.graphql');
if (schemaSha !== schemaLock.sha256) {
  failures.push(
    `schema.lock: schema/governance-v1.graphql sha256 ${schemaSha} != pinned ${schemaLock.sha256}`,
  );
} else {
  console.log(`ok schema-v1 @ ${schemaLock.commitSha.slice(0, 12)} (${schemaSha})`);
}

if (failures.length > 0) {
  for (const f of failures) console.error(`FAIL ${f}`);
  process.exit(1);
}
console.log('pins: OK (offline)');
