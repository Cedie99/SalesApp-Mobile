import type { SQLiteDatabase } from 'expo-sqlite';

// Web migration 144 (2026-10-28): each listed store is assigned to ONE collector
// (`collection_visits.assigned_collector_id`), replacing the shared-pool model.
// Contract (web COLLECTION_DELIVERY_FOR_MOBILE.md §14): a collector's phone shows
// only the stores assigned to them, filtered in the QUERY so it stops downloading
// everyone's stores. Unassigned (NULL) stores are shown to nobody — owner's call,
// confirmed for mobile 2026-11-03.
//
// This is an app filter, not a security boundary: 043's RLS still lets any
// collector read every row. Two additions beyond "assigned to me", so a
// reassignment never yanks work out from under the collector:
//   * `claimed_by = me`   — a store I'm on my way to stays visible even if an
//                           admin reassigns it mid-trip (web leaves the claim alone).
//   * `collector_id = me` — stores I actually worked stay in my history, including
//                           ones listed before 144 (assignee NULL).

/** PostgREST `.or()` filter for the collector's own stores. */
export function collectorVisitScopeFilter(collectorId: string): string {
  return `assigned_collector_id.eq.${collectorId},claimed_by.eq.${collectorId},collector_id.eq.${collectorId}`;
}

// Supabase's default PostgREST `max-rows`. A pull that returns this many rows may
// have been truncated, and pruning against a truncated id set would delete real
// stores — so the prune is skipped for that pass.
const PULL_ROW_CAP = 1000;

/**
 * Sync-down only upserts, so a store that stopped being mine (reassigned to
 * another collector, or pulled before this filter existed) would otherwise sit
 * on the phone forever — visible in the list and still acknowledged as
 * "Delivered" by additional-acks.ts. Deletes every local visit NOT in this
 * pass's pull, except rows still carrying unsent local work: a pending edit
 * (`sync_status`/outbox), a queued payment, or an unuploaded photo.
 */
export async function pruneCollectionVisitsNotInPull(
  db: SQLiteDatabase,
  pulledIds: string[]
): Promise<void> {
  if (pulledIds.length >= PULL_ROW_CAP) return;
  const notPulled = pulledIds.length
    ? `AND collection_visits.id NOT IN (${pulledIds.map(() => '?').join(', ')})`
    : '';
  await db.runAsync(
    `DELETE FROM collection_visits
      WHERE collection_visits.sync_status = 'synced'
        ${notPulled}
        AND NOT EXISTS (SELECT 1 FROM outbox o
                         WHERE o.table_name = 'collection_visits' AND o.record_id = collection_visits.id
                           AND o.status != 'synced')
        AND NOT EXISTS (SELECT 1 FROM collection_payments p
                         WHERE p.visit_id = collection_visits.id AND p.status != 'synced')
        AND NOT EXISTS (SELECT 1 FROM pending_uploads u
                         WHERE u.parent_table = 'collection_visits' AND u.parent_id = collection_visits.id
                           AND u.status != 'synced')`,
    pulledIds
  );
}
