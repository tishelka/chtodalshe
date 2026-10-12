import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { colors, fonts, radii, sizes } from "../theme/tokens";
import type { IconName } from "../theme/categories";

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}
function Button({
  label,
  onPress,
  icon,
  busy,
  disabled,
  style,
  compact,
  secondary = false,
}: ButtonProps & { secondary?: boolean }) {
  const ink = secondary ? colors.text : colors.surface;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : styles.primary,
        compact && { minHeight: 48, paddingHorizontal: 16 },
        (disabled || busy) && { opacity: 0.55 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={ink} />
      ) : (
        icon && <Feather name={icon} size={19} color={ink} />
      )}
      <Text style={[styles.buttonText, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}
export function PrimaryButton(props: ButtonProps) {
  return <Button {...props} />;
}
export function SecondaryButton(props: ButtonProps) {
  return <Button {...props} secondary />;
}
export function IconButton({
  icon,
  label,
  onPress,
  disabled,
  selected = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        selected && { backgroundColor: colors.primarySoft },
        pressed && { opacity: 0.65 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Feather
        name={icon}
        size={21}
        color={selected ? colors.primary : colors.text}
      />
    </Pressable>
  );
}
export function ScreenContainer({
  children,
  scroll = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, style]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
export function PageHeader({
  title,
  subtitle,
  back = false,
  aside,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  aside?: ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      {back && (
        <IconButton
          icon="arrow-left"
          label="Назад"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
        />
      )}
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {aside}
    </View>
  );
}
export function FilterOption({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && { opacity: 0.75 },
      ]}
    >
      {icon && (
        <Feather
          name={icon}
          color={selected ? colors.primary : colors.muted}
          size={18}
        />
      )}
      <Text
        style={[
          styles.optionText,
          selected && { color: colors.primary, fontFamily: fonts.bold },
        ]}
      >
        {label}
      </Text>
      {selected && <Feather name="check" size={16} color={colors.primary} />}
    </Pressable>
  );
}
export function EmptyState({
  title,
  description,
  icon = "compass",
  action,
}: {
  title: string;
  description: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={36} color={colors.primary} />
      </View>
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        {title}
      </Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action && <View style={{ width: "100%", gap: 12 }}>{action}</View>}
    </View>
  );
}
export function LoadingState({
  label = "Готовим твои идеи…",
}: {
  label?: string;
}) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.subtitle}>{label}</Text>
    </View>
  );
}
export function SectionLabel({
  children,
  hint,
}: {
  children: string;
  hint?: string;
}) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionText}>{children}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: sizes.contentMax,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  button: {
    minHeight: sizes.button,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    flexShrink: 1,
    textAlign: "center",
  },
  iconButton: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 8,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 29,
    lineHeight: 38,
    color: colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    marginTop: 6,
  },
  option: {
    minHeight: sizes.touch,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    flexShrink: 1,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 18,
  },
  emptyIcon: {
    width: 92,
    height: 92,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 23,
    lineHeight: 32,
    color: colors.text,
    textAlign: "center",
  },
  emptyDescription: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 25,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 390,
    marginBottom: 12,
  },
  loading: {
    flex: 1,
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  sectionText: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
