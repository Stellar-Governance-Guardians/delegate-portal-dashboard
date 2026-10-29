/**
 * Read-only GraphQL client (D3). The ONLY data source for data pages is the
 * indexer at INDEXER_URL; there is no fallback dataset and no cache of stale
 * values pretending to be live.
 *
 * Fail loud: transport errors, GraphQL errors, non-JSON bodies and responses
 * that do not match the vendored SDL's `IndexerHealth` shape all throw
 * `IndexerUnavailableError` with the exact reason. Pages render that reason.
 */

export interface IndexerHealth {
  cursorLedger: number;
  latestLedger: number;
  oldestLedger: number;
  ledgerRetentionWindow: number;
  lagLedgers: number;
  healthy: boolean;
}

export class IndexerUnavailableError extends Error {
  override readonly name = 'IndexerUnavailableError';
}

/** Query mirrors `indexerHealth` in the vendored governance-v1 SDL. */
export const INDEXER_HEALTH_QUERY = `query IndexerHealth {
  indexerHealth {
    cursorLedger
    latestLedger
    oldestLedger
    ledgerRetentionWindow
    lagLedgers
    healthy
  }
}`;

const REQUEST_TIMEOUT_MS = 4_000;

/** Validate INDEXER_URL: absolute http(s), no embedded credentials. */
export function parseIndexerUrl(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === '') {
    throw new IndexerUnavailableError(
      'INDEXER_URL is not set. Set it to the governance-event-indexer GraphQL endpoint ' +
        '(for example http://127.0.0.1:4000/graphql) before running the dashboard.',
    );
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new IndexerUnavailableError(`INDEXER_URL is not a valid URL (${raw.length} characters).`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new IndexerUnavailableError(`INDEXER_URL must be http(s), got ${url.protocol}`);
  }
  if (url.username !== '' || url.password !== '') {
    throw new IndexerUnavailableError(
      'INDEXER_URL must not embed credentials: the dashboard holds no keys or secrets.',
    );
  }
  return raw;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readInt(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new IndexerUnavailableError(
      `indexerHealth.${key} is not a non-negative integer (got ${JSON.stringify(value)}); ` +
        'the response does not match the vendored schema.',
    );
  }
  return value;
}

/** Strict shape check against the vendored SDL — no coercion, no defaults. */
export function parseIndexerHealth(body: unknown): IndexerHealth {
  if (!isRecord(body)) {
    throw new IndexerUnavailableError('GraphQL response body is not a JSON object.');
  }
  const errors = body['errors'];
  if (Array.isArray(errors) && errors.length > 0) {
    const messages = errors
      .map((e) => (isRecord(e) && typeof e['message'] === 'string' ? e['message'] : JSON.stringify(e)))
      .join('; ');
    throw new IndexerUnavailableError(`Indexer returned GraphQL errors: ${messages}`);
  }
  const data = body['data'];
  if (!isRecord(data) || !isRecord(data['indexerHealth'])) {
    throw new IndexerUnavailableError('GraphQL response has no data.indexerHealth object.');
  }
  const health = data['indexerHealth'];
  const healthy = health['healthy'];
  if (typeof healthy !== 'boolean') {
    throw new IndexerUnavailableError('indexerHealth.healthy is not a boolean.');
  }
  return {
    cursorLedger: readInt(health, 'cursorLedger'),
    latestLedger: readInt(health, 'latestLedger'),
    oldestLedger: readInt(health, 'oldestLedger'),
    ledgerRetentionWindow: readInt(health, 'ledgerRetentionWindow'),
    lagLedgers: readInt(health, 'lagLedgers'),
    healthy,
  };
}

/**
 * Fetch indexer health. `fetchImpl` is injectable for tests only; production
 * always uses the platform fetch.
 */
export async function fetchIndexerHealth(
  indexerUrl: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<IndexerHealth> {
  const url = parseIndexerUrl(indexerUrl);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query: INDEXER_HEALTH_QUERY, operationName: 'IndexerHealth' }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new IndexerUnavailableError(`Indexer request failed: ${detail}`);
  }

  if (!response.ok) {
    throw new IndexerUnavailableError(`Indexer responded HTTP ${response.status} ${response.statusText}.`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new IndexerUnavailableError('Indexer response is not valid JSON.');
  }
  return parseIndexerHealth(body);
}

export type IndexerHealthResult =
  | { ok: true; health: IndexerHealth }
  | { ok: false; reason: string };

/** Testable wrapper for pages: never throws, always returns an explicit state. */
export async function loadIndexerHealth(
  fetchImpl: typeof fetch = fetch,
): Promise<IndexerHealthResult> {
  try {
    return { ok: true, health: await fetchIndexerHealth(process.env['INDEXER_URL'], fetchImpl) };
  } catch (err) {
    if (err instanceof IndexerUnavailableError) return { ok: false, reason: err.message };
    return { ok: false, reason: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
