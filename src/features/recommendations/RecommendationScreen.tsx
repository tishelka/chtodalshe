import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useApp } from "../preferences/AppProvider";
import { ActivityDetails } from "../activities/ActivityCard";
import { ActionNotice } from "../../components/ActionNotice";
import {
  EmptyState,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
} from "../../components/ui";
import { colors, fonts } from "../../theme/tokens";

export function RecommendationScreen() {
  const { series, data, setFavorite, chooseHistory, nextRecommendation, busy } =
    useApp();
  const router = useRouter();
  const edit = () =>
    router.dismissTo({ pathname: "/filters", params: { current: "1" } });
  if (!series)
    return (
      <ScreenContainer>
        <PageHeader title="Твоя следующая идея" back />
        <EmptyState
          title="Начнём с твоих планов"
          description="Выбери условия, чтобы получить подходящее занятие."
          action={
            <PrimaryButton
              label="Подобрать занятие"
              onPress={() => router.replace("/filters")}
            />
          }
        />
      </ScreenContainer>
    );
  const { result } = series;
  if (result.kind !== "success") {
    const title =
      result.kind === "exhausted"
        ? "Все идеи посмотрели"
        : result.kind === "invalid"
          ? "Проверь условия подбора"
          : "Пока не нашли ничего подходящего";
    const description =
      result.kind === "exhausted"
        ? "В этой серии варианты закончились. Можно начать заново или попробовать другие условия."
        : result.kind === "invalid"
          ? result.errors.join(" ")
          : "Попробуй увеличить бюджет, добавить времени или изменить место.";
    return (
      <ScreenContainer>
        <PageHeader title="Твоя следующая идея" back />
        <ActionNotice />
        <EmptyState
          title={title}
          description={description}
          icon={result.kind === "exhausted" ? "check-circle" : "search"}
          action={
            <>
              {result.kind === "exhausted" && (
                <PrimaryButton
                  label="Начать заново"
                  icon="rotate-ccw"
                  busy={busy}
                  onPress={() => {
                    void nextRecommendation(true);
                  }}
                />
              )}
              <SecondaryButton label="Изменить условия" onPress={edit} />
            </>
          }
        />
      </ScreenContainer>
    );
  }
  const activity = result.recommendation.activity;
  const favorite = data.favorites.includes(activity.id);
  const history = data.history.find((entry) => entry.id === series.historyId);
  return (
    <ScreenContainer>
      <PageHeader
        title="Вот твоя идея"
        subtitle="Кажется, это может быть хорошим планом."
        back
      />
      <ActionNotice />
      <ActivityDetails
        activity={activity}
        reasons={result.recommendation.reasons}
      />
      <View style={{ gap: 12 }}>
        <PrimaryButton
          label={history?.chosen ? "План выбран" : "Займусь этим"}
          icon="check"
          disabled={!history || history.chosen || busy}
          onPress={() => {
            if (series.historyId) void chooseHistory(series.historyId);
          }}
        />
        <View style={styles.actions}>
          <SecondaryButton
            style={{ flex: 1 }}
            label="Другое"
            icon="shuffle"
            onPress={() => {
              void nextRecommendation();
            }}
            busy={busy}
          />
          <SecondaryButton
            style={{ flex: 1 }}
            label={favorite ? "В избранном" : "В избранное"}
            icon={favorite ? "check" : "heart"}
            disabled={busy}
            onPress={() => {
              void setFavorite(activity.id, !favorite);
            }}
          />
        </View>
        <Text style={styles.remaining}>
          {result.remainingCount
            ? `Ещё подходящих идей: ${result.remainingCount}`
            : "Последняя новая идея в этой серии"}
        </Text>
      </View>
      <SecondaryButton
        compact
        label="Изменить условия"
        icon="sliders"
        onPress={edit}
        disabled={busy}
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  remaining: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
