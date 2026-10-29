import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The interface pins this build depends on (D1). Read from the committed lock
 * files at request time on the server; scripts/check-pins.mjs verifies the same
 * locks against the vendored bytes in CI, so the page can never state a version
 * that was not pinned.
 *
 * The bundler opt-out keeps Next/Turbopack from tracing the whole project just
 * because two small JSON files are read by path (they are committed at the repo
 * root and are part of the build, not user data).
 */

export interface ParserPin {
  version: string;
  sha256: string;
  assetUrl: string;
  exportsUsed: string[];
}

export interface SchemaPin {
  commitSha: string;
  path: string;
  sha256: string;
}

function readLock<T>(file: string): T {
  const path = join(/*turbopackIgnore: true*/ process.cwd(), file);
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (err) {
    throw new Error(`Cannot read pin ${file}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function readPins(): { parser: ParserPin; schema: SchemaPin } {
  return {
    parser: readLock<ParserPin>('parser.lock'),
    schema: readLock<SchemaPin>('schema.lock'),
  };
}
