import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  FlatList,
  findNodeHandle,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type FlatListProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type ScrollResponder = {
  scrollResponderScrollNativeHandleToKeyboard?: (
    nodeHandle: number,
    additionalOffset?: number,
    preventNegativeScrollOffset?: boolean,
  ) => void;
};

interface KeyboardSpaceProps {
  /**
   * Android only: pads the content's bottom by the keyboard height while it
   * is open. With edge-to-edge on (gradle.properties `edgeToEdgeEnabled`),
   * `adjustResize` no longer shrinks the window for the keyboard, so a field
   * near the end of the content (e.g. Record Meeting's Remarks, directly
   * above Save) had no scroll room left and stayed hidden behind it. Pass
   * false for a screen that already makes its own keyboard room (login.tsx).
   */
  keyboardSpacer?: boolean;
}

function callScrollResponder(responder: object | null, nodeHandle: number) {
  if (!responder) return;
  const candidate = responder as ScrollResponder & { getScrollResponder?: () => object };
  const nested = candidate.getScrollResponder?.();
  const target = nested ?? candidate;
  if ('scrollResponderScrollNativeHandleToKeyboard' in target) {
    const method = target.scrollResponderScrollNativeHandleToKeyboard;
    if (typeof method === 'function') method(nodeHandle, 32, true);
  }
}

/** Adds `space` on top of whatever bottom padding the caller's content style already has. */
function withKeyboardSpace(style: StyleProp<ViewStyle>, space: number): StyleProp<ViewStyle> {
  if (space <= 0) return style;
  const flat = StyleSheet.flatten(style) ?? {};
  const base = flat.paddingBottom ?? flat.paddingVertical ?? flat.padding ?? 0;
  return [style, { paddingBottom: (typeof base === 'number' ? base : 0) + space }];
}

function useKeyboardAwareResponder<T extends object>(keyboardSpacer: boolean) {
  const ref = useRef<T & ScrollResponder>(null);
  const [keyboardSpace, setKeyboardSpace] = useState(0);

  const scrollFocusedInput = useCallback(() => {
    if (Platform.OS !== 'android') return;
    const focused = TextInput.State.currentlyFocusedInput?.();
    if (!focused) return;
    const nativeHandle = findNodeHandle(focused as never) as number | null;
    if (nativeHandle === null) return;
    callScrollResponder(ref.current, Number(nativeHandle));
  }, []);

  useEffect(() => {
    const useSpacer = keyboardSpacer && Platform.OS === 'android';
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      // With the spacer, the scroll waits for the padded re-render (effect
      // below) — scrolling now would still be capped by the old content end.
      if (useSpacer) setKeyboardSpace(event.endCoordinates.height);
      else scrollFocusedInput();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardSpace(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardSpacer, scrollFocusedInput]);

  useEffect(() => {
    if (keyboardSpace <= 0) return;
    const frame = requestAnimationFrame(scrollFocusedInput);
    return () => cancelAnimationFrame(frame);
  }, [keyboardSpace, scrollFocusedInput]);

  return { ref, keyboardSpace };
}

export const KeyboardAwareScrollView = forwardRef<ScrollView, ScrollViewProps & KeyboardSpaceProps>(function KeyboardAwareScrollView(
  { keyboardSpacer = true, contentContainerStyle, ...props },
  forwardedRef,
) {
  const { ref, keyboardSpace } = useKeyboardAwareResponder<ScrollView>(keyboardSpacer);
  useImperativeHandle(forwardedRef, () => ref.current as ScrollView, [ref]);
  const onFocusCapture = useCallback(() => {
    setTimeout(() => {
      const focused = TextInput.State.currentlyFocusedInput?.();
      if (focused) {
        const nativeHandle = findNodeHandle(focused as never) as number | null;
        if (nativeHandle !== null) callScrollResponder(ref.current, Number(nativeHandle));
      }
    }, 50);
  }, [ref]);
  return (
    <View style={{ flex: 1 }} onFocus={onFocusCapture}>
      <ScrollView ref={ref} contentContainerStyle={withKeyboardSpace(contentContainerStyle, keyboardSpace)} {...props} />
    </View>
  );
});

export function KeyboardAwareFlatList<ItemT>({ keyboardSpacer = true, contentContainerStyle, ...props }: FlatListProps<ItemT> & KeyboardSpaceProps) {
  const { ref, keyboardSpace } = useKeyboardAwareResponder<FlatList<ItemT>>(keyboardSpacer);
  const onFocusCapture = useCallback(() => {
    setTimeout(() => {
      const focused = TextInput.State.currentlyFocusedInput?.();
      const nativeHandle = focused ? findNodeHandle(focused as never) as number | null : null;
      if (nativeHandle === null) return;
      callScrollResponder(ref.current, Number(nativeHandle));
    }, 50);
  }, [ref]);
  return (
    <View style={{ flex: 1 }} onFocus={onFocusCapture}>
      <FlatList ref={ref} contentContainerStyle={withKeyboardSpace(contentContainerStyle, keyboardSpace)} {...props} />
    </View>
  );
}
