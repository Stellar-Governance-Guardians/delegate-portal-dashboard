# Fixture-replay demo

This is a two-to-three minute walkthrough for a local clean-clone stack. It
does not claim a hosted URL or live data.

1. Start the indexer and dashboard with the committed fixture replay.
2. Open `/simulate`, paste the real captured ScVal from the parser fixture
   provenance ledger, and show the decoded value and its unverified/verified
   label.
3. Open `/proposal/<id>` and show the explicit unavailable state until decoded
   proposal tables are populated; never substitute a fixture row in the UI.
4. Open `/delegates` and show the raw-count/formula contract and explicit
   unavailable state.
5. Open `/status` and show the indexer health response, parser/schema pins, and
   any fixture-replay provenance.

Every number in a future recording must link to `scripts/prove-dashboard` JSON
and its originating GraphQL response. No video is committed to this repo.
