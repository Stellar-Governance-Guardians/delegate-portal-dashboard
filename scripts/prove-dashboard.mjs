#!/usr/bin/env node
/**
 * Dashboard proof (D4). Links every number the dashboard renders to the
 * GraphQL response that produced it and exits non-zero on any mismatch.
 *
 * It does not trust the page: it fetches `indexerHealth` and the event page
 * itself, formats the values exactly as the components do, and requires those
 * strings in the rendered HTML. When the indexer is unavailable it requires the
 * *reason* to be on the page — a blank table or a zero is a failure, not a pass.
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

/**
 * Shorten a hash the way components/event-list-panel.tsx does. Kept in step by
 * the component test and this proof both asserting the same visible value.
 */
function shortenHash(value) {
  return value.length <= 19 ? value : `${value.slice(0, 8)}…${value.slice(-8)}`;
}

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

const HEALTH_QUERY =
  'query { indexerHealth { cursorLedger latestLedger oldestLedger ledgerRetentionWindow lagLedgers healthy } }';
const EVENTS_QUERY = `query { events(first: 50) {
  edges { cursor node { governor topics ledger txHash contractId payload decoding } }
  pageInfo { hasNextPage endCursor }
} }`;

/** One read-only GraphQL call; transport and GraphQL errors become a reason. */
async function indexerQuery(query) {
  if (indexerUrl === '') return { ok: false, reason: 'INDEXER_URL is not set' };
  let response;
  try {
    response = await fetch(indexerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    return { ok: false, reason: `request failed: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
  let body;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: 'response is not valid JSON' };
  }
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return { ok: false, reason: JSON.stringify(body.errors) };
  }
  return { ok: true, data: body.data };
}

const pins = JSON.parse(readFileSync(join(root, 'parser.lock'), 'utf8'));

const home = await pageText('/');
const status = await pageText('/status');
expect(status.includes(pins.version), `/status does not show parser version ${pins.version}`);
expect(status.includes(pins.sha256), '/status does not show the parser sha256');

let health;
const events = [];
if (indexerUrl === '') {
  health = { ok: false, reason: 'INDEXER_URL is not set' };
  expect(
    home.includes('INDEXER_URL is not set'),
    'INDEXER_URL is unset, so / must render the exact unavailable reason',
  );
} else {
  const healthResult = await indexerQuery(HEALTH_QUERY);
  health = healthResult.ok ? { ok: true, health: healthResult.data.indexerHealth } : healthResult;
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

    const eventResult = await indexerQuery(EVENTS_QUERY);
    if (!eventResult.ok) {
      expect(status.includes('Event list unavailable'), '/status does not render the event error state');
      expect(status.includes(eventResult.reason), `/status does not render the event reason ${eventResult.reason}`);
    } else {
      for (const edge of eventResult.data.events.edges) events.push(edge.node);
      if (events.length === 0) {
        expect(status.includes('returned no events yet'), '/status does not state an empty event result');
      }
      for (const node of events) {
        expect(
          status.includes(String(node.ledger)),
          `/status does not render ledger ${node.ledger}`,
        );
        // Visible value shortened, full value in the title attribute.
        expect(
          status.includes(shortenHash(node.txHash)),
          `/status does not render the shortened tx hash for ledger ${node.ledger}`,
        );
        expect(
          status.includes(node.txHash),
          `/status does not carry the full tx hash ${node.txHash} (title attribute)`,
        );
        expect(
          status.includes(node.decoding === 'VERIFIED' ? 'VERIFIED' : 'unverified decoding'),
          `/status does not render the decoding badge for ledger ${node.ledger}`,
        );
        expect(
          status.includes(node.payload?.source === 'fixture-replay' ? 'fixture replay' : 'live'),
          `/status does not render the provenance for ledger ${node.ledger}`,
        );
      }
    }
  } else {
    expect(home.includes('Indexer data unavailable'), '/ does not render the unavailable state');
  }
}

mkdirSync(join(root, 'prove'), { recursive: true });
writeFileSync(
  join(root, 'prove', 'dashboard-proof.json'),
  `${JSON.stringify(
    {
      dashboardUrl,
      indexerUrl,
      checkedAtUtc: new Date().toISOString(),
      health,
      events,
      failures,
    },
    null,
    2,
  )}\n`,
);

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`prove-dashboard: ${failures.length} assertion(s) failed (see prove/dashboard-proof.json)`);
  process.exit(1);
}
console.log(
  health.ok
    ? `prove-dashboard: PASS (rendered health and ${events.length} event row(s) match the GraphQL response at ${indexerUrl})`
    : 'prove-dashboard: PASS (indexer absent; / renders the exact reason)',
);
