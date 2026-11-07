# Wave issue drafts

These drafts describe the dashboard work in dependency order. Open them as
GitHub issues only after the repository is approved for the Stellar Wave.

| Issue | Dependency |
|---|---|
| Events and proposal review pages | indexer decoded GraphQL fields |
| Delegate metrics with formulas | indexer delegate metrics |
| Production release and live e2e | deployed indexer |

The dashboard remains read-only. It must show unavailable or unverified states
instead of inventing data when the indexer or parser cannot prove an answer.
