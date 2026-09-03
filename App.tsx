import "./src/web/mobileWebFrame";

import { Fredoka_600SemiBold } from "@expo-google-fonts/fredoka/600SemiBold";
import { Fredoka_700Bold } from "@expo-google-fonts/fredoka/700Bold";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { Nunito_600SemiBold } from "@expo-google-fonts/nunito/600SemiBold";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { LoadingScreen } from "./src/components/LoadingScreen";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { assets, ThemeProvider } from "./src/design";
import { PetCareApp } from "./src/features/care/PetCareApp";
import { AdaptiveIOSFrame } from "./src/components/AdaptiveIOSFrame";
import { AnalyticsBootstrap } from "./src/features/analytics/AnalyticsBootstrap";

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) {
    return <LoadingScreen icon={assets.icon} />;
  }

  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <AnalyticsBootstrap />
          <AdaptiveIOSFrame>
            <PetCareApp />
          </AdaptiveIOSFrame>
        </SafeAreaProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
