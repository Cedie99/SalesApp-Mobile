import { describe, expect, it, vi } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  collectorVisitScopeFilter,
  pruneCollectionVisitsNotInPull,
} from './collection-visit-scope';

// Web migration 144: a collector's pull is scoped to their own stores, and
// local stores that stopped being theirs are pruned.

describe('collectorVisitScopeFilter', () => {
  it('matches stores assigned to, claimed by, or worked by the collector — never unassigned ones', () => {
    const filter = collectorVisitScopeFilter('me-1');
    expect(filter.split(',')).toEqual([
      'assigned_collector_id.eq.me-1',
      'claimed_by.eq.me-1',
      'collector_id.eq.me-1',
    ]);
    expect(filter).not.toContain('is.null');
  });
});

describe('pruneCollectionVisitsNotInPull', () => {
  function mockDb() {
    const runAsync = vi.fn().mockResolvedValue(undefined);
    return { db: { runAsync } as unknown as SQLiteDatabase, runAsync };
  }

  it('deletes synced rows outside the pulled ids, keeping rows with unsent work', async () => {
    const { db, runAsync } = mockDb();
    await pruneCollectionVisitsNotInPull(db, ['a', 'b']);
    const [sql, params] = runAsync.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("collection_visits.sync_status = 'synced'");
    expect(sql).toContain('collection_visits.id NOT IN (?, ?)');
    expect(sql).toContain('FROM outbox');
    expect(sql).toContain('FROM collection_payments');
    expect(sql).toContain('FROM pending_uploads');
    expect(params).toEqual(['a', 'b']);
  });

  it('clears every synced row when the collector has no stores', async () => {
    const { db, runAsync } = mockDb();
    await pruneCollectionVisitsNotInPull(db, []);
    const [sql, params] = runAsync.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain('NOT IN');
    expect(params).toEqual([]);
  });

  it('skips the prune when the pull may have been truncated at the row cap', async () => {
    const { db, runAsync } = mockDb();
    await pruneCollectionVisitsNotInPull(db, Array.from({ length: 1000 }, (_, i) => `id-${i}`));
    expect(runAsync).not.toHaveBeenCalled();
  });
});
