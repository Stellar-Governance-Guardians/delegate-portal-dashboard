import Link from 'next/link';
import { EventListPanel } from '@/components/event-list-panel';
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
        <EventListPanel events={events} error={eventsError} />
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
