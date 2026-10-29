import type { Metadata } from 'next';
import { SimulateClient } from './simulate-client';
import { EXAMPLE_SCVAL } from '@/components/simulate-form';

export const metadata: Metadata = {
  title: 'Simulate — Delegate Portal',
  description: 'Decode a base64 XDR ScVal with the pinned parser WASM, entirely in your browser.',
};

export default function SimulatePage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Decode an ScVal</h1>
        <p className="mt-2">
          Paste a base64 XDR <code>ScVal</code> — an event topic, an event value or a call argument. The
          pinned <code>soroban-governance-wasm</code> package decodes it in this tab; nothing is sent to a
          server.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
          Output is the parser&apos;s total ScVal→JSON mapping. Maps with non-string keys, malformed XDR and
          over-limit input fail loudly with the reason — never a partial decode.
        </p>
      </section>

      <SimulateClient />

      <section aria-labelledby="example-provenance" className="text-sm" style={{ color: 'var(--muted)' }}>
        <h2 id="example-provenance" className="font-semibold">
          Example provenance
        </h2>
        <p className="mt-1 break-all">
          <code>{EXAMPLE_SCVAL}</code> is topic[0] of the captured <code>proposal_created</code> event at
          ledger 5035906, tx 34dd7cef8df6234f381563fff88b27a1163557f344f39832ff0e9901711215e3, contract
          CDJWPKSQ4NA67PKTNJEPI6R2Q3JEDXPX5EDPM3YOSEHBDGBZ5THBTOKE. It decodes to the symbol{' '}
          <code>proposal_created</code>.
        </p>
      </section>
    </div>
  );
}
