import { Modal, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { PrimaryButton, SecondaryButton } from "./ui";
export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>
          <PrimaryButton label={confirmLabel} onPress={onConfirm} busy={busy} />
          <SecondaryButton label="Отмена" onPress={onCancel} disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#20251F66",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 28,
    gap: 18,
    width: "100%",
    maxWidth: 430,
  },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  description: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 24,
    color: colors.muted,
  },
});
