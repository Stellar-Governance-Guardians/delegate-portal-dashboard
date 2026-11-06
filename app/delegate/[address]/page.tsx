import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DelegatePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return (
    <div className="space-y-6">
      <h1 className="break-all text-2xl font-semibold">Delegate {address}</h1>
      <div role="alert" className="rounded border p-4">
        <p className="font-semibold">Delegate data unavailable</p>
        <p className="mt-2 text-sm">Raw counts and formulas will render when the indexer&apos;s delegate metrics field is populated.</p>
      </div>
      <Link href="/delegates" className="underline">Back to delegates</Link>
    </div>
  );
}
