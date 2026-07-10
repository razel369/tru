import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance } from "react-native";

import { colorsFor, lightTheme, type ThemeColors, type ThemeName } from "./themes";

/**
 * Theme provider. Reads the system color scheme by default and
 * falls back to the light theme on the web bundle. Tests can
 * override via __setThemeForTests.
 *
 * The provider exposes a `colors` object that mirrors the
 * legacy `colors` import. Components that want to opt in to
 * theme switching consume `useTheme().colors` instead.
 */

interface ThemeContextValue {
  themeName: ThemeName;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeName: "light",
  colors: lightTheme,
});

let testThemeOverride: ThemeName | null = null;

export function __setThemeForTests(theme: ThemeName | null): void {
  testThemeOverride = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemScheme, setSystemScheme] = useState<ThemeName>(() => {
    if (testThemeOverride !== null) return testThemeOverride;
    const raw = Appearance.getColorScheme();
    return raw === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    if (testThemeOverride !== null) return;
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => sub.remove();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ themeName: systemScheme, colors: colorsFor(systemScheme) }),
    [systemScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
