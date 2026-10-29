import { describe, expect, it } from 'vitest';
import {
  decodeScvalInput,
  formatDecoded,
  MAX_INPUT_CHARS,
  normalizeScvalInput,
  SimulateInputError,
} from '@/lib/decode';
import { nodeParserWasm } from '../helpers/parser-node';

// Captured on live testnet; provenance in app/simulate/page.tsx and the parser
// repo's fixture ledger. These are real XDR bytes, not hand-written values.
const CAPTURED_SYMBOL = 'AAAADwAAABBwcm9wb3NhbF9jcmVhdGVk';
const CAPTURED_U32_ONE = 'AAAAAwAAAAE=';
const CAPTURED_ADDRESS = 'AAAAEgAAAAAAAAAAGAjYtOEbrkJZsPDJqVwqIg/Yz33P3732fRtY3s0mCAo=';

describe('normalizeScvalInput', () => {
  it('strips whitespace from wrapped base64', () => {
    expect(normalizeScvalInput(' AAAA\nAwAA AAE= \n')).toBe(CAPTURED_U32_ONE);
  });

  it('rejects empty input with an explicit message', () => {
    expect(() => normalizeScvalInput('  ')).toThrowError(/Paste a base64 XDR ScVal/);
  });

  it('rejects non-base64 characters', () => {
    expect(() => normalizeScvalInput('not base64!')).toThrowError(SimulateInputError);
    expect(() => normalizeScvalInput('not base64!')).toThrowError(/not base64/);
  });

  it('rejects input whose length is not a whole number of bytes', () => {
    expect(() => normalizeScvalInput('AAAAA')).toThrowError(/multiple of 4/);
  });

  it('rejects input above the size limit before touching the decoder', () => {
    const oversized = 'A'.repeat(MAX_INPUT_CHARS + 4);
    expect(() => normalizeScvalInput(oversized)).toThrowError(/limit is 65536/);
  });
});

describe('decodeScvalInput with the pinned WASM', () => {
  it('decodes a captured symbol ScVal', () => {
    const { decoded } = decodeScvalInput(nodeParserWasm, CAPTURED_SYMBOL);
    expect(decoded).toBe('proposal_created');
  });

  it('decodes a captured u32 ScVal', () => {
    const { decoded } = decodeScvalInput(nodeParserWasm, CAPTURED_U32_ONE);
    expect(decoded).toBe(1);
  });

  it('decodes a captured address ScVal to its typed JSON form', () => {
    const { decoded } = decodeScvalInput(nodeParserWasm, CAPTURED_ADDRESS);
    expect(decoded).toEqual({
      _type: 'address:account',
      value: 'GAMARWFU4EN24QSZWDYMTKK4FIRA7WGPPXH57PPWPUNVRXWNEYEAUP3C',
    });
  });

  it('surfaces invalid XDR as a loud input error, never a partial value', () => {
    expect(() => decodeScvalInput(nodeParserWasm, 'AAAA')).toThrowError(SimulateInputError);
  });

  it('formats decoded values as pretty JSON', () => {
    expect(formatDecoded({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(formatDecoded(undefined)).toBe('null');
  });
});
