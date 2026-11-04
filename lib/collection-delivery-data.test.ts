import { describe, expect, it } from 'vitest';

import { dueLabel, isOpenForDelivery, remainingCod, rescheduleTargetIso, type DeliveryPo } from './collection-delivery-data';

// F-007 Delivery partial COD (web 073): the pure helpers that drive the
// "stays open with a carried balance" display + top-up math.
describe('remainingCod', () => {
  it('is the full COD due on a fresh PO (nothing collected yet)', () => {
    expect(remainingCod({ codDue: 10000, codAmount: undefined })).toBe(10000);
  });

  it('carries the balance down after a partial payment', () => {
    expect(remainingCod({ codDue: 10000, codAmount: 4000 })).toBe(6000);
  });

  it('never goes negative on an over-payment', () => {
    expect(remainingCod({ codDue: 10000, codAmount: 12000 })).toBe(0);
  });

  it('is 0 when there is no COD due', () => {
    expect(remainingCod({ codDue: undefined, codAmount: undefined })).toBe(0);
  });
});

describe('isOpenForDelivery', () => {
  it.each(['pending', 'partial'] as DeliveryPo['status'][])('keeps %s open on the list', (status) => {
    expect(isOpenForDelivery(status)).toBe(true);
  });

  it.each(['delivered', 'failed'] as DeliveryPo['status'][])('treats %s as closed', (status) => {
    expect(isOpenForDelivery(status)).toBe(false);
  });
});

// Reschedule calendar: the picked LOCAL day at the current time of day.
describe('rescheduleTargetIso', () => {
  it('keeps the picked local day and the current time of day', () => {
    const iso = rescheduleTargetIso(new Date(2026, 10, 5), new Date(2026, 10, 3, 9, 30, 15));
    const d = new Date(iso);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 5]);
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([9, 30, 15]);
  });

  it('matches the old "tomorrow" behaviour when tomorrow is picked', () => {
    const now = new Date(2026, 10, 3, 14, 0, 0);
    const iso = rescheduleTargetIso(new Date(2026, 10, 4), now);
    expect(new Date(iso).getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

// web 145: a down payment is listed at ₱0 — the customer decides the amount.
describe('dueLabel', () => {
  it('shows the amount due for a normal listing', () => {
    expect(dueLabel({ due: 1500, isDownPayment: false })).toMatch(/^Due .*1,500/);
  });

  it('never shows "Due ₱0" for a down payment', () => {
    expect(dueLabel({ due: 0, isDownPayment: true })).toBe('Customer decides');
  });
});
