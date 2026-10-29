'use client';

import { useId, useState } from 'react';
import {
  decodeScvalInput,
  formatDecoded,
  MAX_INPUT_CHARS,
  normalizeScvalInput,
  SimulateInputError,
  type ScvalDecoder,
} from '@/lib/decode';

/**
 * A real captured ScVal from the seed-v2 governor capture: the `proposal_created`
 * event topic[0] symbol at ledger 5035906, tx
 * 34dd7cef8df6234f381563fff88b27a1163557f344f39832ff0e9901711215e3
 * (provenance: the parser repo's committed fixture ledger, contract CDJWPKSQ…BTOKE).
 */
export const EXAMPLE_SCVAL = 'AAAADwAAABBwcm9wb3NhbF9jcmVhdGVk';

export type LoadDecoder = () => Promise<ScvalDecoder>;

export function SimulateForm({ loadDecoder }: { loadDecoder: LoadDecoder }) {
  const inputId = useId();
  const hintId = useId();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Validate before paying for the WASM load: invalid input must fail
      // without touching the parser artifact.
      const base64 = normalizeScvalInput(input);
      const decoder = await loadDecoder();
      const { decoded } = decodeScvalInput(decoder, base64);
      setOutput(formatDecoded(decoded));
    } catch (err) {
      setOutput(null);
      setError(
        err instanceof SimulateInputError
          ? err.message
          : `Unexpected decode failure: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <label htmlFor={inputId} className="block text-sm font-medium">
          Base64 XDR ScVal
        </label>
        <textarea
          id={inputId}
          name="scval"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          spellCheck={false}
          aria-describedby={hintId}
          placeholder={EXAMPLE_SCVAL}
          className="w-full rounded border p-3"
          style={{ borderColor: 'var(--line)', background: 'var(--panel)', color: 'var(--fg)' }}
        />
        <p id={hintId} className="text-sm" style={{ color: 'var(--muted)' }}>
          Decoded locally in your browser by the pinned parser WASM. Limit {MAX_INPUT_CHARS.toLocaleString()}{' '}
          characters; whitespace is ignored.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-60"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            {busy ? 'Decoding…' : 'Decode'}
          </button>
          <button
            type="button"
            onClick={() => {
              setInput(EXAMPLE_SCVAL);
              setOutput(null);
              setError(null);
            }}
            className="rounded border px-4 py-2 text-sm"
            style={{ borderColor: 'var(--line)' }}
          >
            Use captured example
          </button>
          <button
            type="button"
            onClick={() => {
              setInput('');
              setOutput(null);
              setError(null);
            }}
            className="rounded border px-4 py-2 text-sm"
            style={{ borderColor: 'var(--line)' }}
          >
            Clear
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {error !== null && (
          <p
            role="alert"
            className="rounded border p-3 text-sm break-words"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            {error}
          </p>
        )}
        {output !== null && (
          <section aria-labelledby="decoded-heading" className="space-y-2">
            <h2 id="decoded-heading" className="text-base font-semibold">
              Decoded value
            </h2>
            <pre tabIndex={0} aria-label="Decoded JSON">
              {output}
            </pre>
          </section>
        )}
      </div>
    </div>
  );
}
