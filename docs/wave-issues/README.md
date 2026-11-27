# Wave issue preparation — dashboard

These drafts describe the dashboard work in dependency order. They are for a
follow-up application or Wave after the parser and indexer foundations are
available. Open them as GitHub issues only after the repository is approved for
the Stellar Wave.

| Issue | Dependency |
|---|---|
| Events and proposal review pages | indexer decoded GraphQL fields |
| Delegate metrics with formulas | indexer delegate metrics |
| Production release and live e2e | deployed indexer |

## Readiness classification

- **01 Events and proposal review pages:** the proposal review page is
  delivered: `/proposal/[id]` reads the indexer's `proposal` field and renders
  calls, decoding and the exact risk rule, with explicit unprojected and error
  states. The remaining scope is a dedicated events page beyond `/status` and a
  vote/tally view, which still needs indexer projection.
- **02 Delegate metrics:** blocked until delegate metrics and their formulas
  exist in the indexer schema.
- **03 Production release and live e2e:** blocked until a deployed indexer and
  reproducible runtime configuration exist.

The dashboard remains a credible read-only interface, but these tasks should
not be presented as immediately executable in the first Wave application.

The dashboard remains read-only. It must show unavailable or unverified states
instead of inventing data when the indexer or parser cannot prove an answer.
