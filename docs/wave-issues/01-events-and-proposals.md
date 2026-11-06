# Build events and proposal review pages

## Summary

Turn the current route scaffold into a read-only review flow backed only by the
indexer's GraphQL contract. A reviewer should be able to move from an indexed
event to a proposal, inspect decoded calls and risk evidence, and see an
explicit unverified state whenever the parser cannot prove the interpretation.

## Acceptance criteria

- [ ] Add a paginated events view using the strict GraphQL client.
- [ ] Add proposal detail with governor, proposer, calls, decoding status, and
      each matched risk rule's evidence.
- [ ] Render raw payload, parser pin, and source provenance for unverified data.
- [ ] Keep loading, unavailable, empty, and malformed-response states distinct.
- [ ] Add component and Playwright tests with no fixture imports in production.

## Tech stack

Next.js 16 App Router, React 19, strict TypeScript, GraphQL, Vitest, Playwright.
