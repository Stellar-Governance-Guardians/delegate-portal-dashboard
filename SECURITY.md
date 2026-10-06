# Security Policy

This repository is part of the **Stellar-Governance-Guardians** suite
(`soroban-governance-parser` → `governance-event-indexer` → `delegate-portal-dashboard`).
The suite is read-only v1: the dashboard holds no keys, has no server-side
secrets, signs nothing, and custodies no value. A report should still never
wait when a defect could mislead a user.

## Reporting a vulnerability

Report privately. Do **not** open a public issue:

https://github.com/Stellar-Governance-Guardians/delegate-portal-dashboard/security/advisories/new

Include:

- affected repo and commit or version,
- reproduction steps (URLs, browser/OS, console or network output),
- impact assessment — especially whether a wrong number is presented as
  verified, or an error state is rendered as valid data,
- any suggested fix, if you have one.

## What to expect

- Acknowledgement: within 72 hours (best effort — single maintainer, see CONTRIBUTING.md).
- Triage and severity call: within 7 days.
- Fix: severity-dependent; coordinated disclosure preferred. Reporters are
  credited unless they ask not to be.

## Scope notes

In scope, with examples:

- XSS, injection, or rendering untrusted decoded payloads without sanitization,
- an empty table rendered in a way that looks like "no data" instead of an
  explicit error state,
- an "ESTIMATE" impact shown without its ledger or without the estimate badge,
- fixture data imported into application code,
- secrets committed anywhere in history (this repo must never need any).

Out of scope:

- bugs in upstream governor contracts (report those upstream),
- findings that require a compromised maintainer account,
- availability of the public Soroban testnet RPC or the hosted indexer (not
  operated by this repository's code).

## Secrets

No repository in this suite stores secrets. This dashboard has no server-side
secrets by design — everything it shows is public chain data. If you find a
leaked credential anywhere in this project's history, report it privately and
it will be revoked and handled.

## Supported versions

Pre-1.0: only the latest tagged release and `main` receive fixes.
