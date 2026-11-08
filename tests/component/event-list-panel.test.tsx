import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EventListPanel, shortenHash } from '@/components/event-list-panel';
import type { EventConnection, IndexedEvent } from '@/lib/graphql';

const TX_VERIFIED = 'ddef35404ed2fbef74c1e2324af631398aed9949ff2c7586d56d7cb17bfbea38';
const TX_UNVERIFIED = 'a37b875db6c67674801f604c6a0dea1194cea6ab205bfa5252d55cecdb6d9bda';
const GOVERNOR = 'CCKGJBCBBYNWCMSBPV67DFIG3OL72RLDKNGHWJQCR5NASAUHOQRNLEDX';
const SAC = 'CDJWPKSQ4NA67PKTNJEPI6R2Q3JEDXPX5EDPM3YOSEHBDGBZ5THBTOKE';

function node(overrides: Partial<IndexedEvent>): IndexedEvent {
  return {
    governor: 'script3-soroban-governor',
    topics: ['topic'],
    ledger: 5_035_908,
    txHash: TX_VERIFIED,
    contractId: GOVERNOR,
    payload: { source: 'live' },
    decoding: 'VERIFIED',
    source: 'live',
    ...overrides,
  };
}

function connection(nodes: IndexedEvent[]): EventConnection {
  return {
    edges: nodes.map((n, i) => ({ cursor: `cursor-${i}`, node: n })),
    pageInfo: { hasNextPage: false, endCursor: nodes.length === 0 ? null : `cursor-${nodes.length - 1}` },
  };
}

describe('EventListPanel', () => {
  it('renders one identifiable row per event, with both badges and both provenances', () => {
    render(
      <EventListPanel
        events={connection([
          node({}),
          node({
            governor: 'unverified',
            ledger: 5_035_906,
            txHash: TX_UNVERIFIED,
            contractId: SAC,
            payload: { source: 'fixture-replay', reason: 'no pinned governor adapter matched this event' },
            decoding: 'UNVERIFIED',
            source: 'fixture-replay',
          }),
        ])}
      />,
    );

    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + two events
    expect(screen.getByText('5,035,908'.replace(/,/g, ''))).toBeTruthy();
    expect(screen.getByText('VERIFIED')).toBeTruthy();
    expect(screen.getByText('unverified decoding')).toBeTruthy();
    expect(screen.getByText('live')).toBeTruthy();
    expect(screen.getByText('fixture replay')).toBeTruthy();

    // The visible value is shortened; the full hash is still available.
    expect(screen.getByText(shortenHash(TX_VERIFIED))).toBeTruthy();
    expect(screen.getByTitle(TX_VERIFIED)).toBeTruthy();
    expect(screen.getByTitle(TX_UNVERIFIED)).toBeTruthy();
    expect(screen.getByTitle(GOVERNOR)).toBeTruthy();
    expect(screen.getByTitle(SAC)).toBeTruthy();
  });

  it('shows the exact reason and no table when the event read failed', () => {
    render(<EventListPanel error="request failed: ECONNREFUSED" />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/ECONNREFUSED/)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('states an empty result as empty instead of rendering a blank table', () => {
    render(<EventListPanel events={connection([])} />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/returned no events yet/)).toBeTruthy();
  });
});
