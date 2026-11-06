import { loadIndexerHealth } from '@/lib/graphql';
import { readPins } from '@/lib/pins';

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const health = await loadIndexerHealth();
  const pins = readPins();
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Status</h1>
      <section className="rounded border p-4" aria-labelledby="pins">
        <h2 id="pins" className="font-semibold">Interface pins</h2>
        <p className="mt-2 text-sm">Parser WASM {pins.parser.version}</p>
        <p className="break-all text-sm">sha256: {pins.parser.sha256}</p>
        <p className="break-all text-sm">schema commit: {pins.schema.commitSha}</p>
      </section>
      {health.ok ? (
        <div>
          {health.health?.lagLedgers !== undefined && health.health?.lagLedgers !== null && (
            <p>Lag: {health.health.lagLedgers.toLocaleString()} ledgers</p>
          )}
          {health.health?.ledgerRetentionWindow !== undefined && health.health?.ledgerRetentionWindow !== null && (
            <p>Retention window: {health.health.ledgerRetentionWindow.toLocaleString()} ledgers</p>
          )}
          {health.health?.healthy !== undefined && health.health?.healthy !== null && (
            <p>Healthy: {String(health.health.healthy)}</p>
          )}
        </div>
      ) : (
        <section role="alert" aria-labelledby="indexer-unavailable" className="rounded border p-4">
          <h2 id="indexer-unavailable" className="font-semibold">Indexer data unavailable</h2>
          <p className="mt-2">Indexer unavailable: {health.reason}</p>
        </section>
      )}
    </div>
  );
}
