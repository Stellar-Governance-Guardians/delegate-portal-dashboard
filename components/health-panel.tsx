import type { IndexerHealthResult } from '@/lib/graphql';

const number = new Intl.NumberFormat('en-US');

/**
 * Renders indexer health, or the exact reason it is unavailable. There is no
 * "empty but fine" state: a missing or broken indexer is an error, not a zero.
 */
export function HealthPanel({ result }: { result: IndexerHealthResult }) {
  if (!result.ok) {
    return (
      <section
        aria-labelledby="indexer-unavailable"
        className="rounded-lg border p-4"
        style={{ borderColor: 'var(--danger)', background: 'var(--panel)' }}
      >
        <h2 id="indexer-unavailable" className="text-base font-semibold" style={{ color: 'var(--danger)' }}>
          Indexer data unavailable
        </h2>
        <p className="mt-2 text-sm">This page shows nothing rather than stale or invented numbers.</p>
        <p className="mt-2 text-sm break-words">
          <span className="font-semibold">Reason:</span> {result.reason}
        </p>
      </section>
    );
  }

  const h = result.health;
  return (
    <section aria-labelledby="indexer-health" className="rounded-lg border p-4" style={{ borderColor: 'var(--line)' }}>
      <h2 id="indexer-health" className="text-base font-semibold">
        Indexer health{' '}
        <span
          className="ml-1 rounded px-2 py-0.5 text-xs font-medium"
          style={{
            color: h.healthy ? 'var(--ok)' : 'var(--danger)',
            border: `1px solid ${h.healthy ? 'var(--ok)' : 'var(--danger)'}`,
          }}
        >
          {h.healthy ? 'healthy' : 'unhealthy'}
        </span>
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt style={{ color: 'var(--muted)' }}>Indexed through ledger</dt>
        <dd>{number.format(h.cursorLedger)}</dd>
        <dt style={{ color: 'var(--muted)' }}>Chain latest ledger</dt>
        <dd>{number.format(h.latestLedger)}</dd>
        <dt style={{ color: 'var(--muted)' }}>RPC oldest ledger</dt>
        <dd>{number.format(h.oldestLedger)}</dd>
        <dt style={{ color: 'var(--muted)' }}>RPC retention window</dt>
        <dd>{number.format(h.ledgerRetentionWindow)} ledgers</dd>
        <dt style={{ color: 'var(--muted)' }}>Lag</dt>
        <dd>{number.format(h.lagLedgers)} ledgers</dd>
      </dl>
      {h.healthy ? null : (
        <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>
          The indexer reports itself unhealthy. Treat every list on this dashboard as incomplete until it
          recovers.
        </p>
      )}
    </section>
  );
}
