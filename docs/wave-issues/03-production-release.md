# Publish the dashboard and live-indexer e2e proof

## Summary

Document and execute a production deployment with the indexer endpoint supplied
as a build/runtime configuration value. Prove the deployed app uses the pinned
parser and shows a fail-loud state when the indexer is unavailable.

## Acceptance criteria

- [ ] Document the exact build command, output, Node version, and `INDEXER_URL`
      configuration for the hosting platform.
- [ ] Add a deploy checklist that never places keys or database credentials in
      the frontend environment.
- [ ] Run Playwright against the deployed app with both healthy and unavailable
      indexer scenarios.
- [ ] Record the deployed commit and parser/schema pin values.

## Tech stack

Next.js 16, Node 24, Playwright, the pinned parser WASM, hosted HTTPS.
