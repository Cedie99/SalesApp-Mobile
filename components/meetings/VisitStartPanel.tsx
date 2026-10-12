import { Camera } from 'lucide-react-native';
import { Text, XStack, YStack } from 'tamagui';
import { useBizlinkColors, BIZLINK_FONTS, BIZLINK_ON_INK } from '../../lib/theme';
import { BizSectionHeader } from '../bizlink/BizSectionHeader';
import { ClientCutoffAllowanceBlock } from '../cutoff/ClientCutoffAllowanceBlock';
import { CompanionPicker } from './CompanionPicker';
import { MeetingModeToggle } from './MeetingModeToggle';
import { PhotoCapture, type CapturedPhoto } from './PhotoCapture';
import type { Client, MeetingMode, TeamRosterEntry } from '../../types';

interface VisitStartPanelProps {
  /** W-5 (ADR-053) cutoff allowance line reads client id/status — see ClientCutoffAllowanceBlock's own prop. */
  client: Pick<Client, 'id' | 'status'> | null;
  roster: TeamRosterEntry[];
  selectedCompanions: TeamRosterEntry[];
  onToggleCompanion: (entry: TeamRosterEntry) => void;
  mode: MeetingMode;
  onModeChange: (mode: MeetingMode) => void;
  starting: boolean;
  /** Fires once the Start photo is confirmed — the caller then runs the ongoing-meeting guard + Start confirm dialog. */
  onStart: (startPhoto: CapturedPhoto) => void;
  /** Bumped by the caller when a Start is abandoned (dialog cancelled / blocked) so PhotoCapture remounts unlocked for a fresh shot. */
  photoResetKey: number;
  /** "New Customer Visit" / "Existing Customer Visit" (record-visit.tsx's `visitActionName()`) — status-differentiates the Start button per the audit's "Align" section instead of the generic "Start visit". */
  actionName: string;
  showCompanionPicker?: boolean;
}

/**
 * record-visit.tsx's pre-Start section (meeting mode + companion picker +
 * cutoff allowance + Start photo), extracted so that already-near-the-cap
 * screen stays under the 300-line file limit. Order matches
 * Wireframe-Sales-BizLink.html's `#a-recordvisit` (Meeting mode line 753 →
 * Kasama sa visit line 764 → cutoff allowance line 770 → Start meeting line
 * 772).
 *
 * 2026-10-12: Start takes a photo again (reverses the 2026-07-16
 * location-only Start) — the photo's first-shutter GPS/timestamp become the
 * meeting's start lock, the same way the End photo binds the end.
 */
export function VisitStartPanel({
  client,
  roster,
  selectedCompanions,
  onToggleCompanion,
  mode,
  onModeChange,
  starting,
  onStart,
  photoResetKey,
  actionName,
  showCompanionPicker = true,
}: VisitStartPanelProps) {
  const BIZLINK_COLORS = useBizlinkColors();
  return (
    <YStack marginTop="$4" gap="$4">
      <MeetingModeToggle mode={mode} onChange={onModeChange} />
      {showCompanionPicker ? <CompanionPicker roster={roster} selected={selectedCompanions} onToggle={onToggleCompanion} /> : null}
      <ClientCutoffAllowanceBlock client={client} compact />

      <BizSectionHeader title="Start meeting" />
      <YStack backgroundColor={BIZLINK_COLORS.ink} borderRadius={24} padding={16}>
        <XStack alignItems="center" gap="$3">
          <YStack width={44} height={44} borderRadius={14} backgroundColor={BIZLINK_ON_INK.circleFill} alignItems="center" justifyContent="center">
            {/* Design-System-Catalog §6: BIZLINK_COLORS.card is theme-reactive
                surface color, not a valid foreground on the always-dark `ink`
                bg — BIZLINK_ON_INK.solid stays white in both themes. */}
            <Camera size={18} color={BIZLINK_ON_INK.solid} strokeWidth={1.75} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize={12.5} fontFamily={BIZLINK_FONTS.semibold} color={BIZLINK_ON_INK.solid}>Start photo + location</Text>
            <Text fontSize={11} fontFamily={BIZLINK_FONTS.medium} color={BIZLINK_ON_INK.textMuted}>
              The photo, location and time are saved here; the running timer starts from the photo
            </Text>
          </YStack>
        </XStack>
      </YStack>

      {starting ? (
        <Text fontSize={13.5} fontFamily={BIZLINK_FONTS.semibold} color={BIZLINK_COLORS.brand} textAlign="center">
          Starting meeting…
        </Text>
      ) : (
        <PhotoCapture
          key={photoResetKey}
          label="Start Photo"
          captureButtonLabel="Take START photo"
          confirmButtonLabel={`Start ${actionName}`}
          onConfirm={onStart}
        />
      )}
    </YStack>
  );
}
