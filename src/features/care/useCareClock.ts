import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

const MINUTE_MS = 60 * 1000;

export function useCareClock() {
  const [timestamp, setTimestamp] = useState(() => Date.now());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleNextMinute = () => {
      if (timer) clearTimeout(timer);
      const now = Date.now();
      const delay = MINUTE_MS - (now % MINUTE_MS) + 50;
      timer = setTimeout(() => {
        setTimestamp(Date.now());
        scheduleNextMinute();
      }, delay);
    };
    const refresh = () => {
      setTimestamp(Date.now());
      scheduleNextMinute();
    };

    scheduleNextMinute();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return useMemo(() => new Date(timestamp), [timestamp]);
}
