import Link from 'next/link';
import { HealthPanel } from '@/components/health-panel';
import { fetchIndexerEvents, loadIndexerHealth, type EventConnection } from '@/lib/graphql';
import { readPins } from '@/lib/pins';

export const dynamic = 'force-dynamic';

/**
 * One health rendering, one events rendering. Health and the event list are
 * requested per request: a cached "healthy" would be a lie after the indexer
 * stops, and a cached event list would hide a stalled cursor.
 */
export default async function StatusPage() {
  const health = await loadIndexerHealth();
  const pins = readPins();

  // Only read events when the health read succeeded: a broken indexer already
  // has one precise error state above, and a second copy of the same reason
  // would read as two independent failures.
  let events: EventConnection | undefined;
  let eventsError: string | undefined;
  if (health.ok) {
    try {
      events = await fetchIndexerEvents(process.env['INDEXER_URL']);
    } catch (error) {
      eventsError = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Status</h1>

      <HealthPanel result={health} />

      <section aria-labelledby="pins" className="rounded-lg border p-4" style={{ borderColor: 'var(--line)' }}>
        <h2 id="pins" className="text-base font-semibold">
          Interface pins
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt style={{ color: 'var(--muted)' }}>Parser WASM</dt>
          <dd>{pins.parser.version}</dd>
          <dt style={{ color: 'var(--muted)' }}>Parser sha256</dt>
          <dd className="break-all">{pins.parser.sha256}</dd>
          <dt style={{ color: 'var(--muted)' }}>Schema commit</dt>
          <dd className="break-all">{pins.schema.commitSha}</dd>
        </dl>
      </section>

      {health.ok ? (
      <section aria-labelledby="events" className="rounded-lg border p-4" style={{ borderColor: 'var(--line)' }}>
        <h2 id="events" className="text-base font-semibold">
          Indexed events (oldest first)
        </h2>
        {eventsError !== undefined ? (
          <div role="alert" className="mt-3">
            <p className="font-semibold" style={{ color: 'var(--danger)' }}>
              Event list unavailable
            </p>
            <p className="mt-1 text-sm break-words">
              <span className="font-semibold">Reason:</span> {eventsError}
            </p>
            <p className="mt-1 text-sm">An empty table would read as &quot;no data&quot;, so none is shown.</p>
          </div>
        ) : events === undefined || events.edges.length === 0 ? (
          <p className="mt-3 text-sm">
            The indexer returned no events yet. This is an empty result, not a decoding failure — check the
            cursor and lag above.
          </p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <caption className="sr-only">Indexed governance events with decoding status and provenance</caption>
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
                <th scope="col" className="py-1 font-medium">
                  Source
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
                  <td className="py-1">
                    {edge.node.source === 'fixture-replay' ? 'fixture replay' : 'live'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      ) : null}

      <p className="text-sm">
        <Link href="/" className="underline">
          Back to overview
        </Link>
      </p>
    </div>
  );
}
