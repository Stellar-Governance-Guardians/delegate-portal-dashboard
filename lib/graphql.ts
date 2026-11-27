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

export interface IndexedEvent {
  governor: string;
  topics: string[];
  ledger: number;
  txHash: string;
  contractId: string;
  payload: unknown;
  decoding: 'VERIFIED' | 'UNVERIFIED';
  source: 'live' | 'fixture-replay';
}

export interface EventConnection {
  edges: Array<{ cursor: string; node: IndexedEvent }>;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
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

export const EVENTS_QUERY = `query Events($first: Int, $after: String) {
  events(first: $first, after: $after) {
    edges { cursor node { governor topics ledger txHash contractId payload decoding } }
    pageInfo { hasNextPage endCursor }
  }
}`;

export const PROPOSAL_QUERY = `query Proposal($proposalId: String!, $governorContract: String!) {
  proposal(proposalId: $proposalId, governorContract: $governorContract) {
    governor
    proposalId
    proposer
    decoding
    calls {
      contractId
      functionName
      arguments
      decoding
      risk { tier matchedRule verified }
    }
  }
}`;

export type RiskTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED';

/** Mirrors `RiskClassification` in the vendored governance-v1 SDL. */
export interface RiskClassification {
  tier: RiskTier;
  /** The exact published rule, or the exact reason nothing fired. */
  matchedRule: string;
  verified: boolean;
}

/** Mirrors `DecodedCall` in the vendored governance-v1 SDL. */
export interface DecodedCall {
  contractId: string;
  functionName: string;
  /** JSON: named object when VERIFIED, positional array when UNVERIFIED. */
  arguments: unknown;
  decoding: 'VERIFIED' | 'UNVERIFIED';
  risk: RiskClassification;
}

/** Mirrors `DecodedProposal` in the vendored governance-v1 SDL. */
export interface DecodedProposal {
  governor: string;
  proposalId: string;
  proposer: string | null;
  calls: DecodedCall[];
  decoding: 'VERIFIED' | 'UNVERIFIED';
}

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

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== 'string') throw new IndexerUnavailableError(`event.${key} is not a string.`);
  return value;
}

export function parseEventConnection(body: unknown): EventConnection {
  if (!isRecord(body)) throw new IndexerUnavailableError('GraphQL events response is not a JSON object.');
  if (Array.isArray(body['errors']) && body['errors'].length > 0) {
    throw new IndexerUnavailableError(`Indexer returned GraphQL errors: ${JSON.stringify(body['errors'])}`);
  }
  const data = body['data'];
  if (!isRecord(data) || !isRecord(data['events'])) throw new IndexerUnavailableError('GraphQL response has no events object.');
  const connection = data['events'];
  const edges = connection['edges'];
  const pageInfo = connection['pageInfo'];
  if (!Array.isArray(edges) || !isRecord(pageInfo)) throw new IndexerUnavailableError('events has an invalid connection shape.');
  return {
    edges: edges.map((edge) => {
      if (!isRecord(edge) || !isRecord(edge['node'])) throw new IndexerUnavailableError('events contains an invalid edge.');
      const node = edge['node'];
      const topics = node['topics'];
      if (!Array.isArray(topics) || topics.some((topic) => typeof topic !== 'string')) throw new IndexerUnavailableError('event.topics is invalid.');
      const decoding = node['decoding'];
      if (decoding !== 'VERIFIED' && decoding !== 'UNVERIFIED') throw new IndexerUnavailableError('event.decoding is invalid.');
      const payload = node['payload'];
      if (!isRecord(payload) || (payload['source'] !== 'live' && payload['source'] !== 'fixture-replay')) {
        throw new IndexerUnavailableError('event.payload.source is missing or invalid; provenance cannot be inferred.');
      }
      return {
        cursor: readString(edge, 'cursor'),
        node: {
          governor: readString(node, 'governor'),
          topics,
          ledger: readInt(node, 'ledger'),
          txHash: readString(node, 'txHash'),
          contractId: readString(node, 'contractId'),
          payload,
          decoding,
          source: payload['source'],
        },
      };
    }),
    pageInfo: {
      hasNextPage: pageInfo['hasNextPage'] === true,
      endCursor: pageInfo['endCursor'] === null ? null : readString(pageInfo, 'endCursor'),
    },
  };
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

export async function fetchIndexerEvents(indexerUrl: string | undefined, fetchImpl: typeof fetch = fetch): Promise<EventConnection> {
  const url = parseIndexerUrl(indexerUrl);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query: EVENTS_QUERY, operationName: 'Events', variables: { first: 50 } }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (err) {
    throw new IndexerUnavailableError(`Indexer request failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!response.ok) throw new IndexerUnavailableError(`Indexer responded HTTP ${response.status} ${response.statusText}.`);
  let body: unknown;
  try { body = await response.json(); } catch { throw new IndexerUnavailableError('Indexer response is not valid JSON.'); }
  return parseEventConnection(body);
}

const RISK_TIERS: readonly RiskTier[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED'];

function parseCall(value: unknown, index: number): DecodedCall {
  if (!isRecord(value)) throw new IndexerUnavailableError(`proposal.calls[${index}] is not an object.`);
  const decoding = value['decoding'];
  if (decoding !== 'VERIFIED' && decoding !== 'UNVERIFIED') {
    throw new IndexerUnavailableError(`proposal.calls[${index}].decoding is invalid.`);
  }
  const risk = value['risk'];
  if (!isRecord(risk)) throw new IndexerUnavailableError(`proposal.calls[${index}].risk is missing.`);
  const tier = risk['tier'];
  if (typeof tier !== 'string' || !RISK_TIERS.includes(tier as RiskTier)) {
    throw new IndexerUnavailableError(
      `proposal.calls[${index}].risk.tier is not a published tier (got ${JSON.stringify(tier)}).`,
    );
  }
  if (typeof risk['matchedRule'] !== 'string' || risk['matchedRule'] === '') {
    throw new IndexerUnavailableError(`proposal.calls[${index}].risk.matchedRule is missing.`);
  }
  if (typeof risk['verified'] !== 'boolean') {
    throw new IndexerUnavailableError(`proposal.calls[${index}].risk.verified is not a boolean.`);
  }
  if (!('arguments' in value)) {
    throw new IndexerUnavailableError(`proposal.calls[${index}].arguments is missing.`);
  }
  return {
    contractId: readString(value, 'contractId'),
    functionName: readString(value, 'functionName'),
    arguments: value['arguments'],
    decoding,
    risk: { tier: tier as RiskTier, matchedRule: risk['matchedRule'], verified: risk['verified'] },
  };
}

/**
 * Strict shape check for the `proposal` query. `null` is a real answer: the
 * indexer has not projected that proposal. Anything malformed throws — the
 * page must never render a coerced proposal.
 */
export function parseProposal(body: unknown): DecodedProposal | null {
  if (!isRecord(body)) throw new IndexerUnavailableError('GraphQL proposal response is not a JSON object.');
  if (Array.isArray(body['errors']) && body['errors'].length > 0) {
    const messages = body['errors']
      .map((e) => (isRecord(e) && typeof e['message'] === 'string' ? e['message'] : JSON.stringify(e)))
      .join('; ');
    throw new IndexerUnavailableError(`Indexer returned GraphQL errors: ${messages}`);
  }
  const data = body['data'];
  if (!isRecord(data)) throw new IndexerUnavailableError('GraphQL response has no data object.');
  const proposal = data['proposal'];
  if (proposal === null || proposal === undefined) return null;
  if (!isRecord(proposal)) throw new IndexerUnavailableError('proposal is not an object.');
  const decoding = proposal['decoding'];
  if (decoding !== 'VERIFIED' && decoding !== 'UNVERIFIED') {
    throw new IndexerUnavailableError('proposal.decoding is invalid.');
  }
  const proposer = proposal['proposer'];
  if (proposer !== null && typeof proposer !== 'string') {
    throw new IndexerUnavailableError('proposal.proposer is neither a string nor null.');
  }
  const calls = proposal['calls'];
  if (!Array.isArray(calls)) throw new IndexerUnavailableError('proposal.calls is not an array.');
  return {
    governor: readString(proposal, 'governor'),
    proposalId: readString(proposal, 'proposalId'),
    proposer,
    calls: calls.map(parseCall),
    decoding,
  };
}

/**
 * Resolve the governor contract a proposal page asks about. An explicit
 * `?governor=` wins; otherwise `GOVERNOR_CONTRACT_ID`. A malformed value is an
 * error state, not a silent fallback to some other contract.
 */
export function resolveGovernorContract(override?: string | null): string {
  const candidate = (override ?? '').trim() || (process.env['GOVERNOR_CONTRACT_ID'] ?? '').trim();
  if (candidate === '') {
    throw new IndexerUnavailableError(
      'A governor contract is required. Pass ?governor=<contract id> or set GOVERNOR_CONTRACT_ID ' +
        'to the governor whose proposals the indexer stores.',
    );
  }
  if (!/^C[A-Z2-7]{55}$/.test(candidate)) {
    throw new IndexerUnavailableError(
      `Governor contract is not a valid contract strkey (${candidate.length} characters).`,
    );
  }
  return candidate;
}

/** Fetch one projected proposal. `null` means the indexer has none. */
export async function fetchProposal(
  indexerUrl: string | undefined,
  proposalId: string,
  governorContract: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DecodedProposal | null> {
  const url = parseIndexerUrl(indexerUrl);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        query: PROPOSAL_QUERY,
        operationName: 'Proposal',
        variables: { proposalId, governorContract },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (err) {
    throw new IndexerUnavailableError(`Indexer request failed: ${err instanceof Error ? err.message : String(err)}`);
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
  return parseProposal(body);
}

export type ProposalResult =
  | { ok: true; proposal: DecodedProposal | null }
  | { ok: false; reason: string };

/** Testable wrapper for the page: never throws, always returns a state. */
export async function loadProposal(
  proposalId: string,
  governorOverride?: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<ProposalResult> {
  try {
    const governor = resolveGovernorContract(governorOverride);
    return {
      ok: true,
      proposal: await fetchProposal(process.env['INDEXER_URL'], proposalId, governor, fetchImpl),
    };
  } catch (err) {
    if (err instanceof IndexerUnavailableError) return { ok: false, reason: err.message };
    return { ok: false, reason: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` };
  }
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
