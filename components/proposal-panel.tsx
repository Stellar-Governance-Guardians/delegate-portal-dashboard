import type { DecodedProposal, RiskTier } from '@/lib/graphql';
import { shortenHash } from '@/components/event-list-panel';

const TIER_COLORS: Record<RiskTier, string> = {
  CRITICAL: 'var(--danger)',
  HIGH: 'var(--danger)',
  MEDIUM: 'var(--muted)',
  LOW: 'var(--ok)',
  UNVERIFIED: 'var(--muted)',
};

function RiskBadge({ tier }: { tier: RiskTier }) {
  return (
    <span
      className="rounded px-2 py-0.5 text-xs"
      style={{ border: `1px solid ${TIER_COLORS[tier]}`, color: TIER_COLORS[tier] }}
    >
      {tier}
    </span>
  );
}

function DecodingBadge({ status }: { status: 'VERIFIED' | 'UNVERIFIED' }) {
  return (
    <span
      className="rounded px-2 py-0.5 text-xs"
      style={{
        color: status === 'VERIFIED' ? 'var(--ok)' : 'var(--danger)',
        border: `1px solid ${status === 'VERIFIED' ? 'var(--ok)' : 'var(--danger)'}`,
      }}
    >
      {status === 'VERIFIED' ? 'VERIFIED' : 'unverified decoding'}
    </span>
  );
}

/**
 * One rendering for four states: a read error (with the exact reason and no
 * table), a proposal the indexer has not projected (stated as absent, never
 * synthesized), a proposal whose action could not be decoded (kept, marked
 * UNVERIFIED), and a fully projected proposal.
 *
 * Every risk row shows the parser's `matchedRule` next to the tier: the
 * classification is data, not a verdict, so the rule is never hidden.
 */
export function ProposalPanel({
  proposalId,
  governorContract,
  proposal,
  error,
}: {
  proposalId: string;
  governorContract?: string | undefined;
  proposal?: DecodedProposal | null | undefined;
  error?: string | undefined;
}) {
  if (error !== undefined) {
    return (
      <div role="alert" className="rounded border p-4" style={{ borderColor: 'var(--line)' }}>
        <p className="font-semibold" style={{ color: 'var(--danger)' }}>
          Proposal unavailable
        </p>
        <p className="mt-1 text-sm break-words">
          <span className="font-semibold">Reason:</span> {error}
        </p>
        <p className="mt-1 text-sm">
          The proposal is not shown because the indexer could not be read, not because it does not
          exist.
        </p>
      </div>
    );
  }

  if (proposal === null || proposal === undefined) {
    return (
      <div className="rounded border p-4" style={{ borderColor: 'var(--line)' }}>
        <p className="font-semibold">Proposal {proposalId} is not projected</p>
        <p className="mt-1 text-sm">
          The indexer answered, but has no projection for this proposal under the requested
          governor. Nothing is synthesized from raw events or a sample dataset.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section
        aria-labelledby="proposal-summary"
        className="rounded-lg border p-4"
        style={{ borderColor: 'var(--line)' }}
      >
        <h2 id="proposal-summary" className="text-base font-semibold">
          Proposal {proposal.proposalId}
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt style={{ color: 'var(--muted)' }}>Governor contract</dt>
          <dd>
            {governorContract === undefined ? (
              <span>not provided</span>
            ) : (
              <code title={governorContract}>{shortenHash(governorContract)}</code>
            )}
          </dd>
          <dt style={{ color: 'var(--muted)' }}>Adapter</dt>
          <dd>{proposal.governor}</dd>
          <dt style={{ color: 'var(--muted)' }}>Proposer</dt>
          <dd>
            {proposal.proposer === null ? (
              <span>not recorded by the decoded event</span>
            ) : (
              <code title={proposal.proposer}>{shortenHash(proposal.proposer)}</code>
            )}
          </dd>
          <dt style={{ color: 'var(--muted)' }}>Decoding</dt>
          <dd>
            <DecodingBadge status={proposal.decoding} />
          </dd>
        </dl>
      </section>

      <section
        aria-labelledby="proposal-calls"
        className="rounded-lg border p-4"
        style={{ borderColor: 'var(--line)' }}
      >
        <h2 id="proposal-calls" className="text-base font-semibold">
          Decoded calls
        </h2>
        {proposal.calls.length === 0 ? (
          <p className="mt-2 text-sm">
            The proposal was projected but its action produced no decodable calls
            ({proposal.decoding === 'UNVERIFIED' ? 'the action could not be decoded' : 'empty action'}
            ). Nothing is filled in.
          </p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <caption className="sr-only">
              Decoded calls with target contract, function, arguments, decoding status, risk tier and
              the exact matched rule
            </caption>
            <thead>
              <tr style={{ color: 'var(--muted)' }}>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Target
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Function
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Arguments
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Decoding
                </th>
                <th scope="col" className="py-1 font-medium">
                  Risk (matched rule)
                </th>
              </tr>
            </thead>
            <tbody>
              {proposal.calls.map((call, index) => (
                <tr
                  key={`${call.contractId}:${call.functionName}:${index}`}
                  className="border-t align-top"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <td className="py-1 pr-3">
                    <code title={call.contractId}>{shortenHash(call.contractId)}</code>
                  </td>
                  <td className="py-1 pr-3">{call.functionName}</td>
                  <td className="max-w-xs py-1 pr-3">
                    <code className="block break-all">{JSON.stringify(call.arguments)}</code>
                  </td>
                  <td className="py-1 pr-3">
                    <DecodingBadge status={call.decoding} />
                  </td>
                  <td className="py-1">
                    <RiskBadge tier={call.risk.tier} />
                    <span className="mt-1 block text-xs" style={{ color: 'var(--muted)' }}>
                      {call.risk.matchedRule}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
