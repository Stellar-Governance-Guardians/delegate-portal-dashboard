'use client';

import { SimulateForm } from '@/components/simulate-form';
import { loadParserWasm } from '@/lib/wasm';

export function SimulateClient() {
  return <SimulateForm loadDecoder={loadParserWasm} />;
}
