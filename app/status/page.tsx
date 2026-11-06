"use client";

import { useEffect, useState } from 'react';
import { loadIndexerHealth } from '@/lib/graphql';

export const dynamic = 'force-dynamic';

export default function StatusPage() {
  const [health, setHealth] = useState<{ ok: boolean; reason?: string; health?: { lagLedgers: number; ledgerRetentionWindow: number; healthy: boolean } } | null>(null);

  useEffect(() => {
    ;(async () => {
      const result = await loadIndexerHealth();
      setHealth(result);
    })();
  }, []);

  if (health === null) {
    return <p>Indexer unavailable: loading...</p>;
  }

  return (
    <div className="p-4">
      {health.ok ? (
        <div>
          {health.health?.lagLedgers !== undefined && health.health?.lagLedgers !== null && (
            <p>Lag: {health.health.lagLedgers.toLocaleString()} ledgers</p>
          )}
          {health.health?.ledgerRetentionWindow !== undefined && health.health?.ledgerRetentionWindow !== null && (
            <p>Retention window: {health.health.ledgerRetentionWindow.toLocaleString()} ledgers</p>
          )}
          {health.health?.healthy !== undefined && health.health?.healthy !== null && (
            <p>Healthy: {String(health.health.healthy)}</p>
          )}
        </div>
      ) : (
        <p>Indexer unavailable: {health.reason}</p>
      )}
    </div>
  );
}