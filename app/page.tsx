import Link from 'next/link';
import { HealthPanel } from '@/components/health-panel';
import { loadIndexerHealth } from '@/lib/graphql';

// Health is requested per request: caching a health check would show a stale
// "healthy" after the indexer stops. Never.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const health = await loadIndexerHealth();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Governance, before you vote.</h1>
        <p className="mt-3">
          A read-only surface for Soroban DAOs on Stellar: decode raw proposal payloads, see the published
          risk rule that matched, and read delegate behaviour as raw counts plus formulas — never a single
          opaque score.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Data comes only from <code>INDEXER_URL</code>. This page does not invent a fallback dataset.
        </p>
      </section>

      <HealthPanel result={health} />

      <section aria-labelledby="available">
        <h2 id="available" className="text-lg font-semibold">
          Available now
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <Link href="/simulate">/simulate</Link> — decode any pasted base64 ScVal locally with the pinned
            parser WASM. No indexer needed, no network call.
          </li>
          <li>
            <Link href="/status">/status</Link> — indexer health, the decoded event list with its
            VERIFIED / unverified decoding badge and live-vs-fixture provenance, plus the schema and
            parser WASM pins, with the exact reason when something is unavailable.
          </li>
        </ul>
      </section>

      <section aria-labelledby="not-yet">
        <h2 id="not-yet" className="text-lg font-semibold">
          Not built yet (honest limitations)
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>
            <Link href="/proposal/1">/proposal/[id]</Link>, <Link href="/delegates">/delegates</Link>{' '}
            and <Link href="/delegate/G">/delegate/[address]</Link> are explicit
            &ldquo;unavailable&rdquo; stubs. The indexer&apos;s <code>proposal</code>,{' '}
            <code>delegateMetrics</code> and <code>executionImpact</code> resolvers return an explicit
            unavailable error because the decoded proposal, vote and delegate tables are not populated
            yet. The indexer does persist decoded events, which <Link href="/status">/status</Link>{' '}
            lists with their decoding status.
          </li>
          <li>
            <code>/simulate</code> decodes one pasted base64 ScVal locally in the browser. It does not
            yet paste event XDR, look a transaction hash up on an RPC, or classify risk for a decoded
            call — risk needs the target contract&apos;s spec, which this page does not collect.
          </li>
          <li>No wallet connection and no vote casting: this dashboard is read-only by charter.</li>
        </ul>
      </section>
    </div>
  );
}
