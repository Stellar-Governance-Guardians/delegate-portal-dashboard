# Fixture-replay demo

A two-to-three minute walkthrough of a local clean-clone stack. It does not
claim a hosted URL, live data or a published video.

## Setup (once)

```bash
# terminal 1 — database only; the indexer, dashboard and fixtures are local
cd governance-event-indexer
docker compose up -d postgres
export DATABASE_URL='postgres://indexer:indexer-local-only@localhost:5432/indexer'
npm ci && npm run build && node dist/cli.js migrate
node dist/cli.js replay tests/fixtures/replay --allow-unregistered
node dist/server.js                 # GraphQL on :4000

# terminal 2 — dashboard
cd delegate-portal-dashboard
npm ci && INDEXER_URL=http://127.0.0.1:4000/graphql npm run dev
```

## The script

1. **`/simulate`** — click *Use captured example* and then *Decode*. The value is
   the committed `proposal_created` symbol ScVal from the parser fixture corpus;
   it decodes locally through the pinned WASM. Point out that the page states
   it makes no network call, and that a malformed paste is rejected with a
   specific message rather than an empty result.
2. **`/status`** — show the health panel: indexed-through ledger, chain latest
   ledger, lag in ledgers, and the healthy/unhealthy badge. Below it, the event
   list shows each indexed event with its ledger, governor, `VERIFIED` /
   `unverified decoding` badge and its provenance label (`fixture replay` vs
   `live`). The replay rows in this demo are labeled **fixture replay**; nothing
   pretends to be live.
3. **`/proposal/1`** — show the explicit unavailable state. The indexer's
   `proposal` resolver has no populated decoded tables, and the page says so
   instead of inventing actions, risk rules or a tally.
4. **`/delegates`** and **`/delegate/G…`** — same contract: raw counts with
   published numerators and denominators are the only acceptable display, so an
   unavailable metric is shown as unavailable, never as 0 or a composite score.
5. **`/`** — the homepage health panel and the honest limitations list.

## Reproduce the numbers

```bash
cd delegate-portal-dashboard
INDEXER_URL=http://127.0.0.1:4000/graphql \
DASHBOARD_URL=http://127.0.0.1:3000 \
node scripts/prove-dashboard.mjs
```

`scripts/prove-dashboard.mjs` fetches `indexerHealth` itself, formats the values
the way the server components do, and fails unless those exact strings appear in
the rendered HTML. Its JSON output (`prove/dashboard-proof.json`, gitignored)
is the traceable record for every number shown above. No video is committed to
this repository.
