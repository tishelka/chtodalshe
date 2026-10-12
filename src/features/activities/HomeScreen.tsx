import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useApp } from "../preferences/AppProvider";
import { SURPRISE_FILTERS } from "../../types/domain";
import { filtersLabel } from "../../lib/labels";
import { IdeaArtwork } from "../../components/IdeaArtwork";
import { ActionNotice } from "../../components/ActionNotice";
import {
  IconButton,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionLabel,
} from "../../components/ui";
import { ActivityCard } from "./ActivityCard";
import { colors, fonts } from "../../theme/tokens";

export function HomeScreen() {
  const { data, activities, startSeries, busy } = useApp();
  const router = useRouter();
  const lastEntry = data.history[0];
  const lastActivity = activities.find(
    (activity) => activity.id === lastEntry?.activityId,
  );
  async function surprise() {
    if (await startSeries({ ...SURPRISE_FILTERS }, false))
      router.push("/recommendation");
  }
  return (
    <ScreenContainer>
      <View style={styles.top}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Feather name="compass" size={20} color={colors.surface} />
          </View>
          <Text style={styles.brandName}>ЧтоДальше</Text>
        </View>
        <IconButton
          icon="sliders"
          label="Открыть профиль"
          onPress={() => router.push("/(tabs)/profile")}
        />
      </View>
      <View>
        <Text style={styles.greeting}>СВОБОДНЫЙ МОМЕНТ ДЛЯ СЕБЯ</Text>
        <Text accessibilityRole="header" style={styles.heading}>
          Чем займёмся?
        </Text>
        <Text style={styles.subtitle}>
          Подберём занятие под твои планы на сегодня.
        </Text>
      </View>
      <ActionNotice onRetrySuccess={() => router.push("/recommendation")} />
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>ТВОЙ СЛЕДУЮЩИЙ ХОРОШИЙ ПЛАН</Text>
          <Feather name="arrow-up-right" size={20} color={colors.primary} />
        </View>
        <IdeaArtwork />
        <Text style={styles.heroTitle}>Время есть.{"\n"}Идея найдётся.</Text>
        <Text style={styles.heroDescription}>
          Немного о твоём настроении —{"\n"}и один вариант, который захочется
          попробовать.
        </Text>
        <PrimaryButton
          label="Подобрать занятие"
          icon="arrow-right"
          onPress={() => router.push("/filters")}
        />
      </View>
      <View style={{ gap: 10 }}>
        <SecondaryButton
          label="Удиви меня"
          icon="shuffle"
          onPress={() => {
            void surprise();
          }}
          busy={busy}
        />
        <Text style={styles.note}>
          Без условий. Просто что-нибудь интересное.
        </Text>
      </View>
      {data.preferences.lastFilters && (
        <View style={styles.resume}>
          <View style={{ flex: 1, gap: 7 }}>
            <Text style={styles.resumeTitle}>Продолжить прошлый подбор</Text>
            <Text style={styles.resumeText}>
              {filtersLabel(data.preferences.lastFilters)}
            </Text>
          </View>
          <SecondaryButton
            compact
            label="Повторить"
            icon="rotate-ccw"
            onPress={() =>
              router.push({ pathname: "/filters", params: { repeat: "1" } })
            }
          />
        </View>
      )}
      {lastActivity && (
        <View>
          <SectionLabel hint="Твоя последняя идея">
            Недавно предложили
          </SectionLabel>
          <ActivityCard
            activity={lastActivity}
            onPress={() =>
              router.push({
                pathname: "/activity/[id]",
                params: { id: lastActivity.id, historyId: lastEntry?.id },
              })
            }
          />
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Настроить свои интересы"
        onPress={() => router.push("/(tabs)/profile")}
        style={styles.tip}
      >
        <View style={styles.tipIcon}>
          <Feather name="heart" size={19} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.tipTitle}>
            {data.preferences.interests.length
              ? "Идеи, которые ближе тебе"
              : "Давай познакомимся поближе"}
          </Text>
          <Text style={styles.tipText}>
            {data.preferences.interests.length
              ? "Твои интересы помогают нам с подбором. Их всегда можно изменить."
              : "Выбери свои интересы — и рекомендации станут чуть точнее."}
          </Text>
        </View>
        <Feather name="chevron-right" size={19} color={colors.muted} />
      </Pressable>
      <Text style={styles.bottomNote}>
        Маленькие планы делают день особенным.
      </Text>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  logo: {
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontFamily: fonts.extraBold,
    color: colors.text,
    fontSize: 20,
    letterSpacing: -0.8,
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  heading: {
    fontFamily: fonts.extraBold,
    fontSize: 34,
    lineHeight: 45,
    letterSpacing: -1.5,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 22,
    marginTop: 6,
  },
  hero: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    gap: 17,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 1.1,
    flexShrink: 1,
  },
  heroTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 34,
    lineHeight: 42,
    color: colors.text,
    letterSpacing: -1.1,
    marginTop: -16,
  },
  heroDescription: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 22,
    color: "#63735A",
    marginBottom: 6,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
  },
  resume: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    flexWrap: "wrap",
    flexDirection: "row",
    alignItems: "center",
  },
  resumeTitle: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  resumeText: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 19,
  },
  tip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 6,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  tipTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 13 },
  tipText: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 19,
  },
  bottomNote: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 8,
  },
});
