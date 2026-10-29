import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchIndexerHealth,
  IndexerUnavailableError,
  loadIndexerHealth,
  parseIndexerHealth,
  parseIndexerUrl,
} from '@/lib/graphql';

const HEALTH = {
  cursorLedger: 5_083_000,
  latestLedger: 5_083_120,
  oldestLedger: 4_960_000,
  ledgerRetentionWindow: 120_960,
  lagLedgers: 120,
  healthy: true,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('parseIndexerUrl', () => {
  it('rejects an unset URL instead of defaulting to a host', () => {
    expect(() => parseIndexerUrl(undefined)).toThrowError(/INDEXER_URL is not set/);
    expect(() => parseIndexerUrl('')).toThrowError(/INDEXER_URL is not set/);
  });

  it('rejects non-http schemes and embedded credentials', () => {
    expect(() => parseIndexerUrl('ftp://example.test/graphql')).toThrowError(/http\(s\)/);
    expect(() => parseIndexerUrl('https://user:pass@example.test/graphql')).toThrowError(
      /must not embed credentials/,
    );
  });

  it('accepts a plain http(s) endpoint', () => {
    expect(parseIndexerUrl('http://127.0.0.1:4000/graphql')).toBe('http://127.0.0.1:4000/graphql');
  });
});

describe('parseIndexerHealth', () => {
  it('maps a well-formed response', () => {
    expect(parseIndexerHealth({ data: { indexerHealth: HEALTH } })).toEqual(HEALTH);
  });

  it('surfaces GraphQL errors verbatim', () => {
    expect(() =>
      parseIndexerHealth({ errors: [{ message: 'indexer is behind retention' }] }),
    ).toThrowError(/indexer is behind retention/);
  });

  it('refuses to coerce a missing or malformed value', () => {
    expect(() => parseIndexerHealth({ data: {} })).toThrowError(/no data.indexerHealth/);
    expect(() =>
      parseIndexerHealth({ data: { indexerHealth: { ...HEALTH, lagLedgers: null } } }),
    ).toThrowError(/lagLedgers is not a non-negative integer/);
    expect(() =>
      parseIndexerHealth({ data: { indexerHealth: { ...HEALTH, healthy: 'yes' } } }),
    ).toThrowError(/healthy is not a boolean/);
  });
});

describe('fetchIndexerHealth', () => {
  it('posts the SDL-shaped query and returns validated data', async () => {
    let seen: { url: string; body: string } | undefined;
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      seen = { url: String(url), body: String(init?.body) };
      return jsonResponse({ data: { indexerHealth: HEALTH } });
    }) as typeof fetch;

    const health = await fetchIndexerHealth('http://127.0.0.1:4000/graphql', fetchImpl);
    expect(health).toEqual(HEALTH);
    expect(seen?.url).toBe('http://127.0.0.1:4000/graphql');
    expect(seen?.body).toContain('indexerHealth');
  });

  it('reports HTTP failures, non-JSON bodies and network errors loudly', async () => {
    const http500 = (async () => new Response('boom', { status: 500, statusText: 'Internal Server Error' })) as typeof fetch;
    await expect(fetchIndexerHealth('http://x.test/graphql', http500)).rejects.toThrowError(
      /HTTP 500/,
    );

    const notJson = (async () => new Response('<html>nope</html>', { status: 200 })) as typeof fetch;
    await expect(fetchIndexerHealth('http://x.test/graphql', notJson)).rejects.toThrowError(
      /not valid JSON/,
    );

    const offline = (async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof fetch;
    await expect(fetchIndexerHealth('http://x.test/graphql', offline)).rejects.toThrowError(
      /request failed: ECONNREFUSED/,
    );
  });
});

describe('loadIndexerHealth', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports a missing INDEXER_URL as an explicit reason', async () => {
    vi.stubEnv('INDEXER_URL', '');
    const result = await loadIndexerHealth((async () => {
      throw new Error('must not be called');
    }) as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('INDEXER_URL is not set') });
  });

  it('never throws: unavailable indexers become an explicit reason', async () => {
    vi.stubEnv('INDEXER_URL', 'http://127.0.0.1:9/graphql');
    const offline = (async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof fetch;

    const result = await loadIndexerHealth(offline);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/request failed: ECONNREFUSED/);
  });

  it('wraps a transport-level IndexerUnavailableError with context', async () => {
    vi.stubEnv('INDEXER_URL', 'http://127.0.0.1:9/graphql');
    const result = await loadIndexerHealth((async () => {
      throw new IndexerUnavailableError('custom');
    }) as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'Indexer request failed: custom' });
  });
});
