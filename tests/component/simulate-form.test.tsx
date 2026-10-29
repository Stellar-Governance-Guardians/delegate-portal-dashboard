import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SimulateForm } from '@/components/simulate-form';
import { MAX_INPUT_CHARS } from '@/lib/decode';
import { nodeParserWasm } from '../helpers/parser-node';

const loadDecoder = async () => nodeParserWasm;

describe('SimulateForm', () => {
  it('decodes the captured example without any network access', async () => {
    render(<SimulateForm loadDecoder={loadDecoder} />);

    fireEvent.click(screen.getByRole('button', { name: /use captured example/i }));
    fireEvent.click(screen.getByRole('button', { name: /^decode$/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Decoded JSON').textContent).toContain('proposal_created');
    });
  });

  it('shows an explicit error for non-base64 input and no result', async () => {
    render(<SimulateForm loadDecoder={loadDecoder} />);

    fireEvent.change(screen.getByLabelText(/base64 xdr scval/i), {
      target: { value: 'definitely not base64!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^decode$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/not base64/);
    expect(screen.queryByLabelText('Decoded JSON')).toBeNull();
  });

  it('rejects over-limit input before loading the decoder', async () => {
    let loaded = false;
    render(
      <SimulateForm
        loadDecoder={async () => {
          loaded = true;
          return nodeParserWasm;
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText(/base64 xdr scval/i), {
      target: { value: 'A'.repeat(MAX_INPUT_CHARS + 4) },
    });
    fireEvent.click(screen.getByRole('button', { name: /^decode$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/limit is 65536/);
    expect(loaded).toBe(false);
  });

  it('clears the result and the input', async () => {
    render(<SimulateForm loadDecoder={loadDecoder} />);

    fireEvent.click(screen.getByRole('button', { name: /use captured example/i }));
    fireEvent.click(screen.getByRole('button', { name: /^decode$/i }));
    await screen.findByLabelText('Decoded JSON');

    fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));
    expect(screen.queryByLabelText('Decoded JSON')).toBeNull();
    expect((screen.getByLabelText(/base64 xdr scval/i) as HTMLTextAreaElement).value).toBe('');
  });
});
