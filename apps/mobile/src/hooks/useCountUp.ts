import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 700;

/** Animates a displayed number from 0 up to `value` whenever `value`
 * changes (mount, focus-refresh, a stat updating) — plain JS timing rather
 * than Reanimated, since a ticking number is text content, not a
 * transform/opacity the native thread benefits from animating. */
export function useCountUp(value: number, durationMs: number = DEFAULT_DURATION_MS): number {
  const [displayed, setDisplayed] = useState(0);
  const startValueRef = useRef(0);

  useEffect(() => {
    const startValue = startValueRef.current;
    const startTime = Date.now();
    let frame: ReturnType<typeof requestAnimationFrame>;

    function tick() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutCubic — fast start, gentle settle, matches the spring-y feel
      // the rest of this screen's motion uses.
      const eased = 1 - (1 - progress) ** 3;
      const current = startValue + (value - startValue) * eased;
      setDisplayed(current);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        startValueRef.current = value;
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return displayed;
}
