# Add delegate metrics with published formulas

## Summary

Render delegate participation as raw counts and formulas, never as a composite
trust or performance score. The page must make the denominator visible and
must refuse to display a ratio when its inputs are incomplete.

## Acceptance criteria

- [ ] Consume the indexer's `delegateMetrics` field with strict response checks.
- [ ] Display votes cast, eligible proposals, delegated power, and the exact
      participation formula.
- [ ] Display unavailable and zero-denominator states distinctly.
- [ ] Add tests proving no opaque score or fallback dataset is rendered.

## Tech stack

Next.js 16, React 19, TypeScript, GraphQL, Vitest, Playwright.
