import Feather from "@expo/vector-icons/Feather";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../../src/theme/tokens";
import type { IconName } from "../../src/theme/categories";
const icons: Record<string, IconName> = {
  index: "home",
  favorites: "heart",
  history: "clock",
  profile: "user",
};
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 76 + insets.bottom,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 10,
          lineHeight: 16,
          marginTop: 0,
        },
        tabBarIcon: ({ color }) => (
          <Feather
            name={icons[route.name] ?? "circle"}
            size={22}
            color={color}
          />
        ),
      })}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Главная", tabBarAccessibilityLabel: "Главная" }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: "Избранное", tabBarAccessibilityLabel: "Избранное" }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "История", tabBarAccessibilityLabel: "История" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Профиль", tabBarAccessibilityLabel: "Профиль" }}
      />
    </Tabs>
  );
}
