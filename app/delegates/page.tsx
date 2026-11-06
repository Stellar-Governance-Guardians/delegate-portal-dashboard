export const dynamic = 'force-dynamic';

export default function DelegatesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Delegates</h1>
      <p>
        Delegate metrics are raw counts with published numerators and denominators. No composite score is
        displayed.
      </p>
      <div role="alert" className="rounded border p-4">
        <p className="font-semibold">Delegate data unavailable</p>
        <p className="mt-2 text-sm">
          This page requires the indexer&apos;s delegateMetrics GraphQL field. No fixture or placeholder data is
          rendered until that server contract is available.
        </p>
      </div>
    </div>
  );
}
