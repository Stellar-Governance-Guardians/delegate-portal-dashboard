import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Proposal {id}</h1>
      <div role="alert" className="rounded border p-4">
        <p className="font-semibold">Decoded proposal unavailable</p>
        <p className="mt-2 text-sm">The indexer has not populated decoded proposal tables. No actions, risk flags, tally, or votes are fabricated.</p>
      </div>
      <Link href="/status" className="underline">View indexer status</Link>
    </div>
  );
}
