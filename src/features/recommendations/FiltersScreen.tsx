import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useApp } from "../preferences/AppProvider";
import { DEFAULT_FILTERS, type Filters } from "../../types/domain";
import { locationLabels, moodLabels } from "../../lib/labels";
import { ActionNotice } from "../../components/ActionNotice";
import {
  FilterOption,
  IconButton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SectionLabel,
} from "../../components/ui";
import { colors, fonts } from "../../theme/tokens";
const TIME_OPTIONS = [
  { label: "До 30 минут", value: 30 },
  { label: "Около часа", value: 60 },
  { label: "2 часа", value: 120 },
  { label: "3 часа", value: 180 },
  { label: "4 часа и больше", value: null },
] as const;
const BUDGET_OPTIONS = [
  { label: "Бесплатно", value: 0 },
  { label: "До 500 ₽", value: 500 },
  { label: "До 1500 ₽", value: 1500 },
  { label: "Без ограничений", value: null },
] as const;

export function FiltersScreen() {
  const { repeat, current } = useLocalSearchParams<{
    repeat?: string;
    current?: string;
  }>();
  const { data, series, busy, startSeries } = useApp();
  const [filters, setFilters] = useState<Filters>(() => ({
    ...(current === "1" && series
      ? series.filters
      : repeat === "1" && data.preferences.lastFilters
        ? data.preferences.lastFilters
        : DEFAULT_FILTERS),
    participants:
      (current === "1"
        ? series?.filters.participants
        : repeat === "1"
          ? data.preferences.lastFilters?.participants
          : 1) ?? 1,
  }));
  const router = useRouter();
  function change<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }
  async function submit() {
    if (await startSeries(filters)) router.push("/recommendation");
  }
  return (
    <ScreenContainer>
      <PageHeader
        title="Какой у тебя план?"
        subtitle="Несколько деталей — и подберём одну хорошую идею."
        back
      />
      <ActionNotice onRetrySuccess={() => router.push("/recommendation")} />
      <View style={styles.block}>
        <SectionLabel>Кто участвует?</SectionLabel>
        <View style={styles.counter}>
          <View style={{ flex: 1 }}>
            <Text style={styles.counterLabel}>Количество человек</Text>
            <Text style={styles.counterHint}>От 1 до 10 участников</Text>
          </View>
          <IconButton
            icon="minus"
            label="Уменьшить число участников"
            disabled={(filters.participants ?? 1) <= 1}
            onPress={() =>
              change("participants", (filters.participants ?? 1) - 1)
            }
          />
          <Text
            testID="participants-count"
            accessibilityLiveRegion="polite"
            style={styles.count}
          >
            {filters.participants}
          </Text>
          <IconButton
            icon="plus"
            label="Увеличить число участников"
            disabled={(filters.participants ?? 1) >= 10}
            onPress={() =>
              change("participants", (filters.participants ?? 1) + 1)
            }
          />
        </View>
      </View>
      <View>
        <SectionLabel>Сколько есть времени?</SectionLabel>
        <View style={styles.options}>
          {TIME_OPTIONS.map((option) => (
            <FilterOption
              key={option.label}
              label={option.label}
              selected={filters.availableMinutes === option.value}
              onPress={() => change("availableMinutes", option.value)}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          «4 часа и больше» снимает верхнее ограничение времени.
        </Text>
      </View>
      <View>
        <SectionLabel hint="На одного человека">Какой бюджет?</SectionLabel>
        <View style={styles.options}>
          {BUDGET_OPTIONS.map((option) => (
            <FilterOption
              key={option.label}
              label={option.label}
              selected={filters.budgetPerPerson === option.value}
              onPress={() => change("budgetPerPerson", option.value)}
            />
          ))}
        </View>
      </View>
      <View>
        <SectionLabel>Где хочется провести время?</SectionLabel>
        <View style={styles.options}>
          {(["home", "outdoors", "venue", "any"] as const).map((value) => (
            <FilterOption
              key={value}
              label={locationLabels[value]}
              selected={filters.location === value}
              onPress={() => change("location", value)}
            />
          ))}
        </View>
      </View>
      <View>
        <SectionLabel>Чего хочется сейчас?</SectionLabel>
        <View style={styles.options}>
          {(["calm", "active", "social", "creative", "any"] as const).map(
            (value) => (
              <FilterOption
                key={value}
                label={moodLabels[value]}
                selected={filters.mood === value}
                onPress={() => change("mood", value)}
              />
            ),
          )}
        </View>
      </View>
      <PrimaryButton
        label="Предложить занятие"
        icon="arrow-right"
        onPress={() => {
          void submit();
        }}
        busy={busy}
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  block: { gap: 2 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  counter: {
    backgroundColor: colors.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
  },
  counterLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  counterHint: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
    marginTop: 5,
  },
  count: {
    width: 27,
    textAlign: "center",
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 10,
  },
});
