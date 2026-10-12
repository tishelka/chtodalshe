import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, StyleSheet, View } from "react-native";
import { useApp } from "../preferences/AppProvider";
import { InterestPicker } from "./InterestPicker";
import { ActionNotice } from "../../components/ActionNotice";
import {
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
} from "../../components/ui";
import type { Category } from "../../types/domain";
import { colors, fonts } from "../../theme/tokens";
export function InterestsScreen() {
  const { saveInterests, busy } = useApp();
  const [selected, setSelected] = useState<Category[]>([]);
  const router = useRouter();
  async function complete(categories: Category[]) {
    if (await saveInterests(categories, true)) router.replace("/(tabs)");
  }
  return (
    <ScreenContainer>
      <Text style={styles.step}>ПАРА СЛОВ О ТЕБЕ</Text>
      <PageHeader
        title="Что тебе интересно?"
        subtitle="Выбери любимые занятия. Это поможет нам чаще попадать в настроение."
        back
      />
      <ActionNotice />
      <InterestPicker selected={selected} onChange={setSelected} />
      <View style={{ gap: 12 }}>
        <PrimaryButton
          label="Продолжить"
          onPress={() => {
            void complete(selected);
          }}
          busy={busy}
        />
        <SecondaryButton
          label="Пропустить"
          onPress={() => {
            void complete([]);
          }}
          disabled={busy}
        />
        <Text style={styles.note}>
          Можно выбрать что угодно или вернуться к этому позже.
        </Text>
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  step: {
    fontFamily: fonts.bold,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 12,
  },
  note: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
  },
});
