import Link from 'next/link';
import { ProposalPanel } from '@/components/proposal-panel';
import { loadProposal, resolveGovernorContract, type DecodedProposal } from '@/lib/graphql';

export const dynamic = 'force-dynamic';

/**
 * Read-only proposal review. The only source is the indexer's `proposal`
 * field for the requested (governor, id) pair. There is no sample proposal,
 * no fallback to a sibling contract's id, and no client-side re-derivation —
 * a missing projection is rendered as missing.
 */
export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ governor?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const governorParam = Array.isArray(query.governor) ? query.governor[0] : query.governor;

  // Resolving the governor is separate from the read: a missing or malformed
  // contract id is a configuration error, not an "indexer down" error.
  let governorContract: string | undefined;
  let configError: string | undefined;
  try {
    governorContract = resolveGovernorContract(governorParam);
  } catch (error) {
    configError = error instanceof Error ? error.message : String(error);
  }

  let proposal: DecodedProposal | null | undefined;
  let readError: string | undefined;
  if (governorContract !== undefined) {
    const result = await loadProposal(id, governorContract);
    if (result.ok) proposal = result.proposal;
    else readError = result.reason;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Proposal {id}</h1>

      <ProposalPanel
        proposalId={id}
        governorContract={governorContract}
        proposal={proposal}
        error={configError ?? readError}
      />

      <p className="text-sm">
        <Link href="/status" className="underline">
          View indexer status
        </Link>
      </p>
    </div>
  );
}
