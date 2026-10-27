import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleProp,
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { COLORS } from "../theme/colors";

// Clear space kept between the focused field and the top of the keyboard.
const FIELD_MARGIN = 120;

interface KeyboardScreenProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/** A scrolling form screen that stays usable with the keyboard open. On this
 * app's Android setup the window is not resized by the keyboard, so inputs
 * low on the screen end up hidden behind it. This pads the bottom by the
 * keyboard height and scrolls the focused input into view. */
export function KeyboardScreen({ children, contentContainerStyle }: KeyboardScreenProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;
      setKeyboardHeight(height);
      // Let the padding render, then bring the focused field well above the keyboard. Measured
      // twice: the keyboard's reported height can settle after the first pass on some devices.
      const reveal = () => {
        const focused = TextInput.State.currentlyFocusedInput?.();
        focused?.measureInWindow((_x, y, _w, h) => {
          const visibleBottom = windowHeight - height - FIELD_MARGIN;
          const fieldBottom = y + h;
          if (fieldBottom > visibleBottom) {
            scrollRef.current?.scrollTo({ y: scrollY.current + (fieldBottom - visibleBottom), animated: true });
          }
        });
      };
      setTimeout(reveal, 120);
      setTimeout(reveal, 450);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [windowHeight]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={[{ padding: 24, flexGrow: 1 }, contentContainerStyle, { paddingBottom: 24 + keyboardHeight }]}
      >
        {children}
      </ScrollView>
    </View>
  );
}
