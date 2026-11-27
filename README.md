# Delegate Portal Dashboard

<p align="center">
  <b>Read Soroban governance without connecting a wallet.</b><br>
  Decode payloads in the browser with the pinned parser WASM, and read indexer health exactly as the API returned it.
</p>
<p align="center">
  <a href="https://github.com/Stellar-Governance-Guardians/delegate-portal-dashboard/actions/workflows/ci.yml"><img src="https://github.com/Stellar-Governance-Guardians/delegate-portal-dashboard/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
</p>
<p align="center">
  <a href="https://stellar-governance-guardians.github.io/soroban-governance-parser/"><strong>Documentation</strong></a> ·
  <a href="#run-it"><strong>Quick start</strong></a> ·
  <a href="#interface-pins-d1"><strong>Pins</strong></a> ·
  <a href="https://github.com/Stellar-Governance-Guardians/delegate-portal-dashboard/issues"><strong>Issues</strong></a>
</p>

> [!IMPORTANT]
> **Read-only, and explicit about what is missing.** The app holds no wallet, no keys and no
> secrets. Proposal review renders the indexer's projected calls and risk classifications;
> delegate metrics and execution impact are not built and render explicit unavailable states
> rather than sample data. A missing or broken indexer is an error state, never an empty table.

| | |
|---|---|
| What it is | Next.js 16 read-only dashboard for Soroban governance on Stellar |
| Working routes | `/` (summary + health), `/simulate` (in-browser decode), `/status` (health, decoded events, pins), `/proposal/[id]?governor=<contract>` (projected calls + risk) |
| Unavailable routes | `/delegates`, `/delegate/[address]` — explicit, not faked |
| Data source | `governance-event-indexer` GraphQL via `INDEXER_URL`; unset or unreachable is an error state |
| Pins | parser WASM `v0.1.0-alpha.2` and SDL `governance-v1`, hash-checked offline |
| Tests | Vitest unit/component suites against the real pinned WASM, plus Playwright |
| Documentation | <https://stellar-governance-guardians.github.io/soroban-governance-parser/> |
| Suite | [parser](https://github.com/Stellar-Governance-Guardians/soroban-governance-parser) → [indexer](https://github.com/Stellar-Governance-Guardians/governance-event-indexer) → [dashboard](https://github.com/Stellar-Governance-Guardians/delegate-portal-dashboard) |
| License | [MIT](LICENSE) |

## Overview

Read-only delegate and governance dashboard for Soroban DAOs on Stellar: decode
raw governance payloads in your browser with the pinned parser WASM, and read
live indexer health without ever holding a key.

Part of the Stellar Governance Guardians suite:
[parser](https://github.com/Stellar-Governance-Guardians/soroban-governance-parser) →
[indexer](https://github.com/Stellar-Governance-Guardians/governance-event-indexer) →
**dashboard**.

**Documentation site:**
<https://stellar-governance-guardians.github.io/soroban-governance-parser/> —
architecture, quickstarts, the pinned API reference and the aggregated
limitations for all three repositories.

**Who it's for:** delegates and DAO participants who want to check a payload or
an indexer's freshness without connecting a wallet.

**Proven (offline, machine-checked):** browser `ScVal` decoding through the real
pinned WASM (no mock decode path), strict GraphQL response validation with no
fallback data, and explicit unavailable-indexer states — unit/component tests
and Playwright specs, 8/8 README claims.

**Not built:** delegate metrics, execution impact, `graphql-codegen`, and
event/transaction decode. Those routes exist as explicit unavailable states. See
"Honest limitations".

## Status: read-only app scaffold with `/simulate`, `/status`, and explicit data-page states

This repository contains the application scaffold (Next.js 16 App Router,
strict TypeScript, Tailwind, Vitest, Playwright), the pinned interface
artifacts, and two working surfaces:

| Route | What it does | Depends on |
|---|---|---|
| `/simulate` | Decodes a pasted base64 XDR `ScVal` **locally in the browser** with the pinned `soroban-governance-wasm` build. Validates charset, length (64 KiB) and base64 framing; failures are shown verbatim. | parser WASM only |
| `/status` | Shows the indexer's `indexerHealth`, the decoded event list (first page of 50, oldest first) with its `VERIFIED` / unverified badge, provenance, transaction hash and contract id, and the exact interface pins this build uses — including the machine-readable reason when anything is unavailable. | `INDEXER_URL` |
| `/proposal/[id]` | Runs the indexer's `proposal(proposalId, governorContract)` query and renders the projected calls: target, function, positional arguments, decoding badge, risk tier and the exact matched rule. Distinct states for a read error, an unprojected proposal, and a proposal whose action could not be decoded. | `INDEXER_URL` + `?governor=` or `GOVERNOR_CONTRACT_ID` |
| `/` | Product summary, indexer health, and an explicit list of what is not built. | `INDEXER_URL` |

`/proposal/[id]` is backed by the indexer's `proposal` field: the page asks for
one (governor contract, proposal id) pair and renders the projected calls and
their parser-assigned risk. It requires the governor contract because the same
numeric id exists on every governor — pass `?governor=<contract id>` or set
`GOVERNOR_CONTRACT_ID`. A missing governor, an unreachable indexer and an
unprojected proposal are three distinct, explicit states; none of them renders
a sample proposal. `/delegates` and `/delegate/[address]` remain unavailable
because the indexer's `delegateMetrics` resolver is not populated. The parser's
event exports ship in the pinned `v0.1.0-alpha.2`; the indexer now projects
`proposal_created`; votes, tallies and delegate metrics remain open.

## Run it

```bash
npm ci
npm run dev            # http://localhost:3000
```

`npm run dev`/`build`/`test` first run `scripts/unpack-wasm.mjs`, which verifies
the vendored release tarball against `parser.lock` and unpacks the pinned WASM
into `generated/wasm/` (gitignored). No network access is needed for any of it.

To show indexer data, point the dashboard at a running
[governance-event-indexer](https://github.com/Stellar-Governance-Guardians/governance-event-indexer)
GraphQL endpoint:

```bash
INDEXER_URL=http://127.0.0.1:4000/graphql \
GOVERNOR_CONTRACT_ID=CCKGJBCBBYNWCMSBPV67DFIG3OL72RLDKNGHWJQCR5NASAUHOQRNLEDX \
npm run dev
```

`GOVERNOR_CONTRACT_ID` is only needed by `/proposal/[id]`; an explicit
`?governor=` query parameter overrides it.

If `INDEXER_URL` is unset or unreachable, every data surface shows an explicit
error with the reason. There is no bundled sample dataset, no cached fallback
and no silent zero.

## Checks

```bash
npm run typecheck     # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm run lint          # eslint (Next core-web-vitals + no-fixture-imports)
npm run test:unit     # Vitest: unit + component suites
npm run test:e2e      # Playwright against `next build && next start`
npm run check:pins    # sha256 of the vendored WASM + SDL vs the lock files
bash scripts/check-claims.sh   # machine-checks the claims made in this README
```

The unit and component tests use the **real** pinned WASM (nodejs target) as
their decoder — there is no mock decode path. The e2e run uses system Chrome
and deliberately leaves `INDEXER_URL` unset to prove the fail-loud state. The
GitHub workflow runs all of the above plus the charter checks (community files,
organization-only links, no personal account names, no fixture imports, no
secrets via gitleaks).

## Interface pins (D1)

| Artifact | Pin | Verified by |
|---|---|---|
| GraphQL SDL `governance-v1` | `schema.lock` — parser commit `ba3bf1a3…`, sha256 `cfbd85a8…` | `npm run check:pins` |
| Parser WASM `v0.1.0-alpha.2` | `parser.lock` — GitHub Release asset, sha256 `65193e43…` | `npm run check:pins`, `scripts/unpack-wasm.mjs` |

Committed cross-repo references are content pins only. Nothing in `app/`,
`components/` or `lib/` reads a sibling repository by relative path.

## Architecture

```
app/                 routes (server components read INDEXER_URL; /simulate is client-side)
app/api/             (none yet — no server-side data transformation is needed)
components/          presentational, testable, no data fetching
lib/decode.ts        input validation + decode orchestration (pure, tested)
lib/graphql.ts       strict GraphQL client: no coercion, no defaults, no fallback data
lib/pins.ts          reads the lock files for /status
lib/wasm.ts          loads the pinned WASM (browser)
scripts/             pin check, WASM unpack, claims runner
e2e/                 Playwright specs
```

Data rules in force:

- The indexer is the dashboard's data source. A missing or broken indexer is an error
  state, never an empty table that reads as "no data".
- Numbers are rendered exactly as the API returned them; nothing is rounded
  away or composited into a score.
- The app is read-only: no wallet, no signing, no keys, no server-side secrets.

The dashboard is the presentation layer of the suite: the parser supplies the
browser decoder, the indexer supplies GraphQL health and governance data, and
this app renders explicit loading, unavailable, and error states instead of
turning missing data into zeros.

## Honest limitations

- Only `decode_scval_base64` from the pinned WASM is used directly in the
  browser. Proposal calls and risk are rendered from the indexer's stored
  projection, not re-decoded client-side; event XDR and transaction-hash lookup
  are not wired into this dashboard yet.
- `/proposal/[id]` shows proposals the indexer has projected. With today's
  committed corpus that means verified `proposal_created` events; the replay
  fixture comes from the fixture governor, which the pinned adapter does not
  claim, so a local replay produces no proposal rows. The page states that
  explicitly rather than falling back to raw events.
- `/delegates` and `/delegate/[address]` render unavailable states. The
  indexer's `delegateMetrics` and `executionImpact` resolvers return an explicit
  "unavailable: decoded governance tables are not populated yet" error, so there
  is no vote tally, delegate ratio or impact estimate to display yet.
- Codegen of typed GraphQL operations is deferred until the indexer exposes the
  full schema; today the two queries (`indexerHealth`, `events`) and their
  response shapes are hand-written and strictly validated in `lib/graphql.ts`.
- `/status` reads pins from the working tree (`parser.lock`, `schema.lock`) and
  shows them as build dependencies; it cannot prove what a *deployed* instance
  was built from.
- Lighthouse accessibility scores have not been measured and are not claimed.
  The UI has landmarks, a skip link, visible focus, labelled controls, an
  `aria-live` result region and light/dark tokens; formal audit is pending.
- End-to-end live-indexer coverage is still pending. `/status` now reads
  `indexerHealth` and the paginated `events` connection, but CI exercises the
  unavailable-indexer scenario only and no deployed integration is claimed.
  `scripts/prove-dashboard.mjs` can be pointed at a running pair to check that
  the rendered numbers match the GraphQL response.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Run the
static checks and unit tests locally, keep the app read-only, and update the
pin and claims files when an interface artifact changes. Report security issues
through [SECURITY.md](SECURITY.md), not a public issue.

## 🤝 Community & maintainers

Join the discussion and get support:

- **Telegram**: [t.me/+OmwD30ukO0wzZWU0](https://t.me/+OmwD30ukO0wzZWU0)
- **Discord**: [discord.gg/UPbr5FFjX](https://discord.gg/UPbr5FFjX)
- **Issues and task work**: [delegate-portal-dashboard issues](https://github.com/Stellar-Governance-Guardians/delegate-portal-dashboard/issues)
- **Documentation hub**: <https://stellar-governance-guardians.github.io/soroban-governance-parser/>
- **The other repositories**: [soroban-governance-parser](https://github.com/Stellar-Governance-Guardians/soroban-governance-parser)
  (decoding) and [governance-event-indexer](https://github.com/Stellar-Governance-Guardians/governance-event-indexer)
  (indexing and GraphQL)

| Maintainer | Role | Scope |
|---|---|---|
| Organization maintainers | Project direction and maintainer contact | Code ownership remains via [CODEOWNERS](.github/CODEOWNERS) |

The repository is maintained in the `Stellar-Governance-Guardians` organization.
Maintainer contact is through the organization's issues and discussions.

[![Contributors](https://contrib.rocks/image?repo=Stellar-Governance-Guardians/delegate-portal-dashboard)](https://github.com/Stellar-Governance-Guardians/delegate-portal-dashboard/graphs/contributors)

## License

MIT — see [LICENSE](./LICENSE).
