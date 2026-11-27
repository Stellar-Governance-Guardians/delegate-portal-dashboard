import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProposalPanel } from '@/components/proposal-panel';
import type { DecodedProposal } from '@/lib/graphql';

const GOVERNOR = 'CCKGJBCBBYNWCMSBPV67DFIG3OL72RLDKNGHWJQCR5NASAUHOQRNLEDX';
const TREASURY = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const PROPOSER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

const PROPOSAL: DecodedProposal = {
  governor: 'script3',
  proposalId: '7',
  proposer: PROPOSER,
  decoding: 'VERIFIED',
  calls: [
    {
      contractId: TREASURY,
      functionName: 'transfer',
      arguments: [PROPOSER, TREASURY, '1000'],
      decoding: 'UNVERIFIED',
      risk: { tier: 'LOW', matchedRule: 'no contextual rule fired', verified: false },
    },
    {
      contractId: GOVERNOR,
      functionName: 'set_admin',
      arguments: [PROPOSER],
      decoding: 'UNVERIFIED',
      risk: { tier: 'HIGH', matchedRule: 'self_call', verified: false },
    },
  ],
};

describe('ProposalPanel', () => {
  it('renders every call with its exact risk tier and matched rule', () => {
    render(<ProposalPanel proposalId="7" governorContract={GOVERNOR} proposal={PROPOSAL} />);

    expect(screen.getByRole('heading', { name: 'Proposal 7' })).toBeTruthy();
    expect(screen.getByText('script3')).toBeTruthy();
    // The governor appears twice: as the reviewed contract and as the target
    // of the self-call.
    expect(screen.getAllByTitle(GOVERNOR)).toHaveLength(2);
    expect(screen.getByText('transfer')).toBeTruthy();
    expect(screen.getByText('set_admin')).toBeTruthy();
    expect(screen.getByText('LOW')).toBeTruthy();
    expect(screen.getByText('no contextual rule fired')).toBeTruthy();
    expect(screen.getByText('HIGH')).toBeTruthy();
    expect(screen.getByText('self_call')).toBeTruthy();
    expect(screen.getAllByText('unverified decoding')).toHaveLength(2);
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + two calls
  });

  it('shows the exact reason and no table when the indexer read failed', () => {
    render(
      <ProposalPanel
        proposalId="7"
        governorContract={GOVERNOR}
        error="Indexer request failed: ECONNREFUSED"
      />,
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/ECONNREFUSED/)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('states an unprojected proposal as absent instead of an empty table', () => {
    render(<ProposalPanel proposalId="7" governorContract={GOVERNOR} proposal={null} />);
    expect(screen.getByText(/is not projected/)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('explains an empty call list without inventing one', () => {
    render(
      <ProposalPanel
        proposalId="7"
        governorContract={GOVERNOR}
        proposal={{ ...PROPOSAL, calls: [], decoding: 'UNVERIFIED' }}
      />,
    );
    expect(screen.getByText(/action could not be decoded/)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
