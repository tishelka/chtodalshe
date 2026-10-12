import { StyleSheet, Text, View } from "react-native";
import { useApp } from "../features/preferences/AppProvider";
import { colors, fonts } from "../theme/tokens";
import { SecondaryButton } from "./ui";
export function ActionNotice({ onRetrySuccess }: { onRetrySuccess?: () => void }) {
  const { actionError, dismissError, busy } = useApp();
  if (!actionError) return null;
  return (
    <View accessibilityRole="alert" style={styles.box}>
      <Text style={styles.text}>{actionError.message}</Text>
      <View style={styles.actions}>
        <SecondaryButton
          compact
          label="Повторить попытку"
          onPress={() => {
            void actionError.retry().then(success => { if (success) onRetrySuccess?.(); });
          }}
          busy={busy}
        />
        <SecondaryButton compact label="Закрыть" onPress={dismissError} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.dangerSoft,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 22,
    color: colors.danger,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
