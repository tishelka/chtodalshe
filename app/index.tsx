import { Redirect } from "expo-router";
import { useApp } from "../src/features/preferences/AppProvider";
export default function Index() {
  const { data } = useApp();
  return (
    <Redirect
      href={data.preferences.onboardingCompleted ? "/(tabs)" : "/onboarding"}
    />
  );
}
