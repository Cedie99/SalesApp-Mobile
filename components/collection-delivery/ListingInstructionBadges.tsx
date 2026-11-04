import { StatusBadge } from '../ui/StatusBadge';
import { COLORS } from '../../lib/theme';
import { isOpenForCollection, type CollectionStore } from '../../lib/collection-delivery-data';

/**
 * The office's instructions for a store still to be collected, so the collector
 * knows before they arrive: "For counter" (web 143 — pay at the counter only) and
 * "Down payment" (the customer decides the amount, web 145). Hidden
 * once the store is worked — they're instructions for the visit, not history.
 */
export function ListingInstructionBadges({
  store,
}: {
  store: Pick<CollectionStore, 'status' | 'designatedMethod' | 'isDownPayment'>;
}) {
  if (!isOpenForCollection(store.status)) return null;
  return (
    <>
      {store.designatedMethod === 'counter' ? (
        <StatusBadge label="For counter" background={COLORS.redSoft} color={COLORS.ledgeRed} />
      ) : null}
      {store.isDownPayment ? (
        <StatusBadge label="Down payment" background={COLORS.amberSoft} color={COLORS.orange} />
      ) : null}
    </>
  );
}
