/**
 * /simulate input handling (D2).
 *
 * The browser decodes through the PINNED parser WASM (see lib/wasm.ts); this
 * module owns the validation and the size limits, and is deliberately pure so
 * it can be tested in Node against the same pinned artifact.
 *
 * Fail loud: every rejection is a `SimulateInputError` with a reason the UI
 * shows verbatim. Nothing is trimmed into a "close enough" decode and nothing
 * is decoded partially.
 */

/** Hard input cap. Base64 expands 4 chars per 3 bytes, so this is a 48 KiB ScVal. */
export const MAX_INPUT_CHARS = 64 * 1024;

/** What the parser WASM must provide. Satisfied by the pinned release asset. */
export interface ScvalDecoder {
  /** Decode a base64 XDR ScVal into JSON. Throws with a decoder message on bad input. */
  decodeScval(base64: string): unknown;
}

export class SimulateInputError extends Error {
  override readonly name = 'SimulateInputError';
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Normalize pasted input: strip all whitespace (XDR is often copy-pasted in
 * wrapped lines), then enforce the charset, block length and 4-char grouping.
 * Returns the canonical base64 string.
 */
export function normalizeScvalInput(raw: string): string {
  if (typeof raw !== 'string') {
    throw new SimulateInputError('Input must be text.');
  }
  const compact = raw.replace(/\s+/g, '');
  if (compact === '') {
    throw new SimulateInputError('Paste a base64 XDR ScVal first.');
  }
  if (compact.length > MAX_INPUT_CHARS) {
    throw new SimulateInputError(
      `Input is ${compact.length} characters; the limit is ${MAX_INPUT_CHARS} (a 48 KiB ScVal).`,
    );
  }
  if (!BASE64.test(compact)) {
    throw new SimulateInputError(
      'Input is not base64: only A-Z, a-z, 0-9, "+", "/" and trailing "=" are allowed.',
    );
  }
  if (compact.length % 4 !== 0) {
    throw new SimulateInputError(
      `Input is ${compact.length} base64 characters, which is not a whole number of bytes (must be a multiple of 4).`,
    );
  }
  return compact;
}

export interface DecodeOutcome {
  /** Canonical input that was decoded. */
  base64: string;
  /** Decoded JSON value (object, array, string, number, boolean or null). */
  decoded: unknown;
}

/**
 * Validate then decode. Decoder failures (invalid XDR, unsupported ScVal) are
 * surfaced as `SimulateInputError` with the parser's own message — never as an
 * empty result.
 */
export function decodeScvalInput(decoder: ScvalDecoder, raw: string): DecodeOutcome {
  const base64 = normalizeScvalInput(raw);
  try {
    const decoded = decoder.decodeScval(base64);
    return { base64, decoded };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new SimulateInputError(detail);
  }
}

/** Pretty JSON for display. Strings are rendered as JSON so quotes stay visible. */
export function formatDecoded(decoded: unknown): string {
  return JSON.stringify(decoded, null, 2) ?? 'null';
}
