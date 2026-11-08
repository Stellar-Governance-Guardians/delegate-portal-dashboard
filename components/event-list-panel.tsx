import type { EventConnection } from '@/lib/graphql';

/** Shorten a hash for display; the full value stays in the title attribute. */
export function shortenHash(value: string): string {
  return value.length <= 19 ? value : `${value.slice(0, 8)}…${value.slice(-8)}`;
}

/**
 * One rendering for three distinct states: an explicit error (with the reason
 * and no table), a genuinely empty result (stated as empty, not as a zero), or
 * the rows. Every row is identifiable: ledger, governor, decoding badge,
 * provenance, transaction hash and contract id.
 */
export function EventListPanel({
  events,
  error,
}: {
  events?: EventConnection | undefined;
  error?: string | undefined;
}) {
  if (error !== undefined) {
    return (
      <div role="alert" className="mt-3">
        <p className="font-semibold" style={{ color: 'var(--danger)' }}>
          Event list unavailable
        </p>
        <p className="mt-1 text-sm break-words">
          <span className="font-semibold">Reason:</span> {error}
        </p>
        <p className="mt-1 text-sm">An empty table would read as &quot;no data&quot;, so none is shown.</p>
      </div>
    );
  }

  if (events === undefined || events.edges.length === 0) {
    return (
      <p className="mt-3 text-sm">
        The indexer returned no events yet. This is an empty result, not a decoding failure — check the
        cursor and lag above.
      </p>
    );
  }

  return (
    <table className="mt-3 w-full text-left text-sm">
      <caption className="sr-only">
        Indexed governance events with decoding status, provenance, transaction hash and contract id
      </caption>
      <thead>
        <tr style={{ color: 'var(--muted)' }}>
          <th scope="col" className="py-1 pr-3 font-medium">
            Ledger
          </th>
          <th scope="col" className="py-1 pr-3 font-medium">
            Governor
          </th>
          <th scope="col" className="py-1 pr-3 font-medium">
            Decoding
          </th>
          <th scope="col" className="py-1 pr-3 font-medium">
            Source
          </th>
          <th scope="col" className="py-1 pr-3 font-medium">
            Transaction
          </th>
          <th scope="col" className="py-1 font-medium">
            Contract
          </th>
        </tr>
      </thead>
      <tbody>
        {events.edges.map((edge) => (
          <tr key={edge.cursor} className="border-t" style={{ borderColor: 'var(--line)' }}>
            <td className="py-1 pr-3">{edge.node.ledger}</td>
            <td className="py-1 pr-3">{edge.node.governor}</td>
            <td className="py-1 pr-3">
              <span
                className="rounded px-2 py-0.5 text-xs"
                style={{
                  color: edge.node.decoding === 'VERIFIED' ? 'var(--ok)' : 'var(--danger)',
                  border: `1px solid ${edge.node.decoding === 'VERIFIED' ? 'var(--ok)' : 'var(--danger)'}`,
                }}
              >
                {edge.node.decoding === 'VERIFIED' ? 'VERIFIED' : 'unverified decoding'}
              </span>
            </td>
            <td className="py-1 pr-3">{edge.node.source === 'fixture-replay' ? 'fixture replay' : 'live'}</td>
            <td className="py-1 pr-3">
              <code title={edge.node.txHash}>{shortenHash(edge.node.txHash)}</code>
            </td>
            <td className="py-1">
              <code title={edge.node.contractId}>{shortenHash(edge.node.contractId)}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
