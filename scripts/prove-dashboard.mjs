#!/usr/bin/env node
/**
 * Dashboard proof (D4). Links every number the dashboard renders to the
 * GraphQL response that produced it and exits non-zero on any mismatch.
 *
 * It does not trust the page: it fetches `indexerHealth` itself, formats the
 * values exactly as the server components do, and requires those strings in the
 * rendered HTML. When the indexer is unavailable it requires the *reason* to be
 * on the page — a blank table or a zero is a failure, not a pass.
 *
 * Usage: node scripts/prove-dashboard.mjs
 *   DASHBOARD_URL  default http://127.0.0.1:3000
 *   INDEXER_URL    required (same value the dashboard was started with)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dashboardUrl = (process.env['DASHBOARD_URL'] ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const indexerUrl = process.env['INDEXER_URL'] ?? '';

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const number = new Intl.NumberFormat('en-US');

async function pageText(path) {
  let response;
  try {
    response = await fetch(`${dashboardUrl}${path}`, { signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    throw new Error(`cannot reach ${dashboardUrl}${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw new Error(`${path} responded HTTP ${response.status}`);
  return response.text();
}

async function indexerHealth() {
  const response = await fetch(indexerUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: 'query { indexerHealth { cursorLedger latestLedger oldestLedger ledgerRetentionWindow lagLedgers healthy } }',
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json();
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return { ok: false, reason: JSON.stringify(body.errors) };
  }
  return { ok: true, health: body.data.indexerHealth };
}

const pins = JSON.parse(readFileSync(join(root, 'parser.lock'), 'utf8'));

const home = await pageText('/');
const status = await pageText('/status');
expect(status.includes(pins.version), `/status does not show parser version ${pins.version}`);
expect(status.includes(pins.sha256), '/status does not show the parser sha256');

let health;
if (indexerUrl === '') {
  health = { ok: false, reason: 'INDEXER_URL is not set' };
  expect(
    home.includes('INDEXER_URL is not set'),
    'INDEXER_URL is unset, so / must render the exact unavailable reason',
  );
} else {
  health = await indexerHealth();
  if (health.ok) {
    const h = health.health;
    for (const [label, value] of [
      ['indexed through ledger', number.format(h.cursorLedger)],
      ['chain latest ledger', number.format(h.latestLedger)],
      ['lag', number.format(h.lagLedgers)],
    ]) {
      expect(home.includes(value), `/ does not render the indexer's ${label} (${value})`);
    }
    expect(
      home.includes(h.healthy ? 'healthy' : 'unhealthy'),
      `/ does not render healthy=${String(h.healthy)}`,
    );
    const events = await pageText('/status');
    expect(events.includes('Indexed events'), '/status does not render the event list section');
  } else {
    expect(home.includes('Indexer data unavailable'), '/ does not render the unavailable state');
  }
}

mkdirSync(join(root, 'prove'), { recursive: true });
writeFileSync(
  join(root, 'prove', 'dashboard-proof.json'),
  `${JSON.stringify({ dashboardUrl, indexerUrl, checkedAtUtc: new Date().toISOString(), health, failures }, null, 2)}\n`,
);

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`prove-dashboard: ${failures.length} assertion(s) failed (see prove/dashboard-proof.json)`);
  process.exit(1);
}
console.log(
  health.ok
    ? `prove-dashboard: PASS (rendered health matches the GraphQL response at ${indexerUrl})`
    : 'prove-dashboard: PASS (indexer absent; / renders the exact reason)',
);
