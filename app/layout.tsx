import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Delegate Portal — Soroban governance',
  description:
    'Read-only delegate and governance dashboard for Soroban DAOs: decode ScVals and proposal risk offline, and read live indexer health.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="mx-auto max-w-3xl px-5 py-8">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>
        <header className="mb-8 border-b pb-4" style={{ borderColor: 'var(--line)' }}>
          <nav aria-label="Primary" className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/" className="font-semibold">
              Delegate Portal
            </Link>
            <Link href="/simulate">Simulate</Link>
            <Link href="/status">Status</Link>
          </nav>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Read-only. No wallet, no keys, no server-side secrets.
          </p>
        </header>
        <main id="main">{children}</main>
        <footer
          className="mt-12 border-t pt-4 text-sm"
          style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
        >
          <p>
            Part of the Stellar Governance Guardians suite:{' '}
            <a href="https://github.com/Stellar-Governance-Guardians/soroban-governance-parser">
              parser
            </a>{' '}
            →{' '}
            <a href="https://github.com/Stellar-Governance-Guardians/governance-event-indexer">
              indexer
            </a>{' '}
            → dashboard.
          </p>
        </footer>
      </body>
    </html>
  );
}
