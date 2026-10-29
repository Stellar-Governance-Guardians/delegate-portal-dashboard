import type { Metadata } from 'next';
import { HealthPanel } from '@/components/health-panel';
import { loadIndexerHealth } from '@/lib/graphql';
import { readPins } from '@/lib/pins';

export const metadata: Metadata = {
  title: 'Status — Delegate Portal',
  description: 'Indexer health and the interface pins this dashboard was built against.',
};

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const health = await loadIndexerHealth();
  const pins = readPins();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Status</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          What this build actually depends on, and whether the indexer is current.
        </p>
      </section>

      <HealthPanel result={health} />

      <section aria-labelledby="pins">
        <h2 id="pins" className="text-lg font-semibold">
          Interface pins
        </h2>
        <dl className="mt-2 space-y-3 text-sm">
          <div>
            <dt className="font-medium">GraphQL schema (governance-v1)</dt>
            <dd className="break-all" style={{ color: 'var(--muted)' }}>
              parser commit <code>{pins.schema.commitSha}</code>
              <br />
              <code>{pins.schema.path}</code>
              <br />
              sha256 <code>{pins.schema.sha256}</code>
            </dd>
          </div>
          <div>
            <dt className="font-medium">Parser WASM</dt>
            <dd className="break-all" style={{ color: 'var(--muted)' }}>
              version <code>{pins.parser.version}</code>
              <br />
              sha256 <code>{pins.parser.sha256}</code>
              <br />
              exports used: <code>{pins.parser.exportsUsed.join(', ')}</code>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
          <code>npm run check:pins</code> verifies both hashes against the vendored bytes; it runs in CI and
          needs no network.
        </p>
      </section>
    </div>
  );
}
