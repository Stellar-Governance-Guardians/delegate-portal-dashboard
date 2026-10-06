# Contributing

Thanks for helping the Stellar-Governance-Guardians suite — a three-repo program
(parser → indexer → dashboard) run under a written charter. This document covers
the mechanics. The charter rules below are enforced by CI, not by convention.

## Branch and merge policy (`main` is protected)

`main` is guarded by a repository ruleset:

- **Pull request required.** Direct pushes and force pushes to `main` are rejected.
- **CI required.** All required checks must pass before merge (list below).
- **Linear history required.** Rebase or squash only; merge commits are rejected.
- **Required approvals: 0 while the project is single-owner.** This is deliberate:
  the sole maintainer cannot approve their own PR, so requiring 1 would deadlock
  the repository. Raise this to 1 in the same change that adds a second
  maintainer with write access, and update this document.

Required checks for this repository:

| check | verifies |
|---|---|
| `charter rules` | required community files present, org-namespace URLs only, no personal account names in tracked sources |

This repository is a stub during Step 0. Its real CI (TypeScript strict build,
component tests, Playwright e2e against a live indexer, a11y gates) lands in
Phase 3 and is added to the required-checks list in the same change.

## Workflow

1. Branch from the latest `main`: `git switch -c <type>/<short-name> origin/main`.
2. Make one scoped change. The program workflow is
   READ → PLAN → BUILD → PROVE → DOCUMENT → AUDIT → REPORT.
3. Run what you can locally — CI is the authoritative gate.
4. Open a PR using the template. Fill the checklist in honestly.
5. Merge with `gh pr merge <n> --rebase` (or `--squash`) when checks are green.

## Commit style

Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `test:`,
`refactor:`. One logical change per commit. Explain *why* in the body when it is
not obvious from the diff.

## Charter rules (standing, enforced)

1. **Zero mock data in production paths.** CI fails if application code imports
   test fixtures. The app renders live indexer data or explicit error states.
2. **Fail closed, fail loud.** Untrusted decoded payloads are sanitized; a
   missing spec or failed decode shows an "unverified decoding" badge, never a
   guess.
3. **Governor-agnostic.** All decoding goes through the parser WASM package
   pinned by `parser.lock`; no governor-specific rendering branches.
4. **Estimates are labeled.** Impact panels are badged "ESTIMATE at ledger N".
5. **No secrets.** No keys, tokens, or credentials in any file, branch, or
   history. No server-side secrets exist at all.
6. **Org namespace only.** Tracked files never reference personal-account URLs.
7. **Claims ledger.** Any machine-checkable claim in docs gets a check that CI
   runs.
8. **Delegate metrics are data, not verdicts.** Always render numerator and
   denominator; never a single opaque score.
9. **v1 is read-only.** The dashboard never signs, submits, or writes to chain
   state; `/simulate` is a pure estimate against a public RPC.

## Fixtures and evidence

Every fixture carries provenance (network, RPC, ledger, tx hash) in the
fixtures README. No provenance, no commit. Evidence files print full hashes —
never truncate.

## Security

See [SECURITY.md](SECURITY.md). Do not open public issues for vulnerabilities.
