'use client';

/**
 * Browser loader for the pinned parser WASM (D1/D2).
 *
 * The artifact is unpacked from the committed release tarball by
 * scripts/unpack-wasm.mjs (sha256 verified against parser.lock) and bundled
 * from `generated/wasm/web`. No network fetch of a CDN, no unpinned version:
 * the bytes are the ones the lock file names.
 */

import init, { decode_scval_base64 } from '../generated/wasm/web/sgp_parser_wasm.js';
import type { ScvalDecoder } from './decode';

let ready: Promise<ScvalDecoder> | undefined;

export function loadParserWasm(): Promise<ScvalDecoder> {
  ready ??= init().then(() => ({
    decodeScval(base64: string): unknown {
      return JSON.parse(decode_scval_base64(base64)) as unknown;
    },
  }));
  return ready;
}
