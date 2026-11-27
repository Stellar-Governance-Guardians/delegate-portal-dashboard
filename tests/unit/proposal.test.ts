import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchProposal,
  loadProposal,
  parseProposal,
  resolveGovernorContract,
  type DecodedProposal,
} from '@/lib/graphql';

const GOVERNOR = 'CCKGJBCBBYNWCMSBPV67DFIG3OL72RLDKNGHWJQCR5NASAUHOQRNLEDX';
const TREASURY = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

const PROPOSAL: DecodedProposal = {
  governor: 'script3',
  proposalId: '7',
  proposer: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  decoding: 'VERIFIED',
  calls: [
    {
      contractId: TREASURY,
      functionName: 'transfer',
      arguments: ['GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', TREASURY, '1000'],
      decoding: 'UNVERIFIED',
      risk: { tier: 'LOW', matchedRule: 'no contextual rule fired', verified: false },
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('parseProposal', () => {
  it('maps a well-formed proposal', () => {
    expect(parseProposal({ data: { proposal: PROPOSAL } })).toEqual(PROPOSAL);
  });

  it('treats a null proposal as a real answer, not an error', () => {
    expect(parseProposal({ data: { proposal: null } })).toBeNull();
  });

  it('surfaces GraphQL errors verbatim', () => {
    expect(() => parseProposal({ errors: [{ message: 'indexer is behind retention' }] })).toThrowError(
      /indexer is behind retention/,
    );
  });

  it('refuses to coerce a malformed call', () => {
    const missingArguments = {
      data: {
        proposal: {
          ...PROPOSAL,
          calls: [{ ...PROPOSAL.calls[0], arguments: undefined }],
        },
      },
    };
    // `arguments: undefined` is dropped by JSON, so the key is genuinely absent.
    expect(() => parseProposal(JSON.parse(JSON.stringify(missingArguments)))).toThrowError(
      /arguments is missing/,
    );

    const unknownTier = {
      data: {
        proposal: {
          ...PROPOSAL,
          calls: [{ ...PROPOSAL.calls[0], risk: { ...PROPOSAL.calls[0]!.risk, tier: 'CATASTROPHIC' } }],
        },
      },
    };
    expect(() => parseProposal(unknownTier)).toThrowError(/not a published tier/);

    const emptyRule = {
      data: {
        proposal: {
          ...PROPOSAL,
          calls: [{ ...PROPOSAL.calls[0], risk: { ...PROPOSAL.calls[0]!.risk, matchedRule: '' } }],
        },
      },
    };
    expect(() => parseProposal(emptyRule)).toThrowError(/matchedRule is missing/);
  });
});

describe('resolveGovernorContract', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers the explicit query value and accepts a contract strkey', () => {
    vi.stubEnv('GOVERNOR_CONTRACT_ID', '');
    expect(resolveGovernorContract(GOVERNOR)).toBe(GOVERNOR);
  });

  it('falls back to GOVERNOR_CONTRACT_ID', () => {
    vi.stubEnv('GOVERNOR_CONTRACT_ID', GOVERNOR);
    expect(resolveGovernorContract(undefined)).toBe(GOVERNOR);
  });

  it('explains what to set when neither is present', () => {
    vi.stubEnv('GOVERNOR_CONTRACT_ID', '');
    expect(() => resolveGovernorContract(undefined)).toThrowError(/A governor contract is required/);
  });

  it('rejects a malformed contract id instead of querying another contract', () => {
    vi.stubEnv('GOVERNOR_CONTRACT_ID', '');
    expect(() => resolveGovernorContract('CCKGJBC')).toThrowError(/not a valid contract strkey/);
  });
});

describe('fetchProposal', () => {
  it('posts the proposal id and governor as variables', async () => {
    let seen: string | undefined;
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      seen = String(init?.body);
      return jsonResponse({ data: { proposal: PROPOSAL } });
    }) as typeof fetch;

    await expect(
      fetchProposal('http://127.0.0.1:4000/graphql', '7', GOVERNOR, fetchImpl),
    ).resolves.toEqual(PROPOSAL);
    expect(seen).toContain('"proposalId":"7"');
    expect(seen).toContain(GOVERNOR);
  });
});

describe('loadProposal', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the indexer reason when INDEXER_URL is unset', async () => {
    vi.stubEnv('INDEXER_URL', '');
    const result = await loadProposal('7', GOVERNOR, (async () => {
      throw new Error('must not be called');
    }) as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('INDEXER_URL is not set') });
  });

  it('returns a null proposal as an ok result', async () => {
    vi.stubEnv('INDEXER_URL', 'http://127.0.0.1:4000/graphql');
    const result = await loadProposal(
      '7',
      GOVERNOR,
      (async () => jsonResponse({ data: { proposal: null } })) as typeof fetch,
    );
    expect(result).toEqual({ ok: true, proposal: null });
  });
});
