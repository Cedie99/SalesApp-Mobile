import { Modal, Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { BIZLINK_COLORS, BIZLINK_FONTS } from '../../lib/theme';
import { BizButton } from '../bizlink/BizButton';

interface StartMeetingConfirmDialogProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** record-visit.tsx overrides this since its Start now includes a photo (2026-10-12); the full form keeps the default. */
  message?: string;
}

/**
 * Wireframe `#a-startConfirmDlg` (Wireframe-Sales-BizLink.html:1058):
 * "Start meeting?" / "Ila-lock ang current GPS at timestamp. Hindi pa
 * kukuha ng photo hanggang sa End Meeting." / Cancel / "Yes, start".
 * Same Modal/Pressable-overlay pattern as LostOpportunityDialog — reused
 * rather than inventing new dialog styling.
 */
export function StartMeetingConfirmDialog({
  visible,
  onCancel,
  onConfirm,
  message = 'Your current location and time will be saved. No photo will be taken until End Meeting.',
}: StartMeetingConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <YStack backgroundColor={BIZLINK_COLORS.card} borderRadius={24} padding="$4.5" width={320}>
            <Text fontSize={18} fontFamily={BIZLINK_FONTS.semibold} color={BIZLINK_COLORS.text}>Start meeting?</Text>
            <Text fontSize={13} fontFamily={BIZLINK_FONTS.medium} color={BIZLINK_COLORS.muted} marginTop="$2" lineHeight={19}>
              {message}
            </Text>
            <XStack gap="$2.5" marginTop="$4.5">
              <YStack flex={1}><BizButton label="Cancel" variant="white" onPress={onCancel} /></YStack>
              <YStack flex={1}><BizButton label="Yes, start" onPress={onConfirm} /></YStack>
            </XStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
