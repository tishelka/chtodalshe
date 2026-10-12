import { useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, View } from "react-native";
import { useApp } from "./AppProvider";
import { InterestPicker } from "../onboarding/InterestPicker";
import { hasBackendConfiguration } from "../../lib/backend";
import { ActionNotice } from "../../components/ActionNotice";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionLabel,
} from "../../components/ui";
import { colors, fonts } from "../../theme/tokens";
import type { Category } from "../../types/domain";
export function ProfileScreen() {
  const { data, mode, busy, saveInterests, clearHistory, switchMode } =
    useApp();
  const [draft, setDraft] = useState<Category[] | null>(null);
  const selected = draft ?? data.preferences.interests;
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [saved, setSaved] = useState(false);
  const changed =
    selected.slice().sort().join(",") !==
    data.preferences.interests.slice().sort().join(",");
  async function save() {
    if (await saveInterests(selected)) {
      setDraft(null);
      setSaved(true);
    }
  }
  return (
    <ScreenContainer>
      <PageHeader
        title="Твой профиль"
        subtitle="Немного о тебе, чтобы идеи были ближе."
      />
      <ActionNotice />
      <View style={styles.mode}>
        <View style={styles.modeIcon}>
          <Feather
            name={mode === "demo" ? "smartphone" : "cloud"}
            size={25}
            color={colors.primary}
          />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.modeTitle}>
            {mode === "demo" ? "Демонстрационный режим" : "Серверный режим"}
          </Text>
          <Text style={styles.modeDescription}>
            {mode === "demo"
              ? "Твои данные сохраняются на этом устройстве. Подбор работает без интернета."
              : "Твои данные сохраняются в подключённой базе. Для работы нужен интернет."}
          </Text>
        </View>
      </View>
      <View>
        <SectionLabel hint={`${selected.length} из 10`}>
          Твои интересы
        </SectionLabel>
        <InterestPicker
          selected={selected}
          onChange={(categories) => {
            setDraft(categories);
            setSaved(false);
          }}
        />
        <Text style={styles.note}>
          Интересы помогают ранжировать идеи. Можно оставить список пустым и
          открывать новое.
        </Text>
      </View>
      <PrimaryButton
        label={saved && !changed ? "Интересы сохранены" : "Сохранить интересы"}
        icon={saved && !changed ? "check" : "heart"}
        busy={busy}
        disabled={!changed}
        onPress={() => {
          void save();
        }}
      />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Твои данные</Text>
        <Text style={styles.description}>
          Сохранено идей: {data.favorites.length}. Рекомендаций в истории:{" "}
          {data.history.length}.
        </Text>
        <SecondaryButton
          label="Очистить историю"
          icon="trash-2"
          onPress={() => setConfirmClear(true)}
          disabled={!data.history.length || busy}
        />
        {hasBackendConfiguration && (
          <SecondaryButton
            label={
              mode === "demo" ? "Подключить сервер" : "Открыть деморежим"
            }
            icon="refresh-cw"
            onPress={() => setConfirmSwitch(true)}
            disabled={busy}
          />
        )}
      </View>
      <View style={styles.about}>
        <Feather name="compass" color={colors.primary} size={26} />
        <Text style={styles.aboutTitle}>ЧтоДальше</Text>
        <Text style={styles.description}>
          Меньше времени на выбор, больше — на то, что тебе нравится. Версия
          1.0.0.
        </Text>
      </View>
      <ConfirmDialog
        visible={confirmClear}
        title="Очистить историю?"
        description="Все записи истории будут удалены. Избранное и интересы сохранятся."
        confirmLabel="Да, очистить"
        busy={busy}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          void clearHistory().then(() => setConfirmClear(false));
        }}
      />
      <ConfirmDialog
        visible={confirmSwitch}
        title="Переключить режим?"
        description="В каждом режиме свой набор интересов, избранного и истории. Данные сохранятся отдельно и не будут переноситься автоматически."
        confirmLabel="Переключить"
        busy={busy}
        onCancel={() => setConfirmSwitch(false)}
        onConfirm={() => {
          setConfirmSwitch(false);
          void switchMode(mode === "demo" ? "api" : "demo");
        }}
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  mode: {
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    padding: 20,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFFAA",
    justifyContent: "center",
    alignItems: "center",
  },
  modeTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  modeDescription: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 19,
    color: colors.primary,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 20,
    marginTop: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 20,
    gap: 16,
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  description: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 21,
  },
  about: { padding: 12, alignItems: "center", gap: 10 },
  aboutTitle: { fontFamily: fonts.extraBold, color: colors.text, fontSize: 20 },
});
