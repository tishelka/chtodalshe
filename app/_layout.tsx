import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "../src/features/preferences/AppProvider";
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
} from "../src/components/ui";
import { colors } from "../src/theme/tokens";

export const unstable_settings = { initialRouteName: "index" };
function Navigation() {
  const { status, data, mode, loadError, reload, switchMode } = useApp();
  if (status === "loading")
    return (
      <ScreenContainer scroll={false}>
        <LoadingState label="Готовим твои идеи…" />
      </ScreenContainer>
    );
  if (status === "error")
    return (
      <ScreenContainer>
        <EmptyState
          title="Не удалось загрузить данные"
          description={loadError ?? "Попробуй ещё раз."}
          icon="wifi-off"
          action={
            <>
              <PrimaryButton
                label="Повторить попытку"
                onPress={() => {
                  void reload();
                }}
              />
              {mode === "api" && (
                <SecondaryButton
                  label="Открыть деморежим"
                  onPress={() => {
                    void switchMode("demo");
                  }}
                />
              )}
            </>
          }
        />
      </ScreenContainer>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Protected guard={!data.preferences.onboardingCompleted}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="interests" />
      </Stack.Protected>
      <Stack.Protected guard={data.preferences.onboardingCompleted}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="filters" />
        <Stack.Screen name="recommendation" />
        <Stack.Screen name="activity/[id]" />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {loaded || error ? (
        <AppProvider>
          <Navigation />
        </AppProvider>
      ) : (
        <ScreenContainer scroll={false}>
          <LoadingState />
        </ScreenContainer>
      )}
    </SafeAreaProvider>
  );
}
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <ScreenContainer>
        <EmptyState
          title="Что-то пошло не так"
          description="Попробуй открыть экран ещё раз. Сохранённые данные останутся на месте."
          action={<PrimaryButton label="Повторить попытку" onPress={retry} />}
        />
      </ScreenContainer>
    </SafeAreaProvider>
  );
}
