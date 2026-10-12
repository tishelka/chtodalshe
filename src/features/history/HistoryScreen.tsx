import { useRouter } from "expo-router";
import { FlatList, Text, StyleSheet, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useApp } from "../preferences/AppProvider";
import { ActivityCard } from "../activities/ActivityCard";
import { ActionNotice } from "../../components/ActionNotice";
import {
  EmptyState,
  IconButton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
} from "../../components/ui";
import { filtersLabel } from "../../lib/labels";
import { colors, fonts } from "../../theme/tokens";
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
export function HistoryScreen() {
  const { data, activities, chooseHistory, busy } = useApp();
  const router = useRouter();
  return (
    <ScreenContainer scroll={false} style={{ paddingBottom: 0 }}>
      <PageHeader
        title="История идей"
        subtitle="Всё, что предлагали. И планы, которые ты выбрал."
      />
      <ActionNotice />
      <FlatList
        data={data.history}
        keyExtractor={(entry) => entry.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 20, paddingBottom: 32, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            title="Первая идея ещё впереди"
            description="Здесь появятся твои рекомендации и выбранные занятия."
            icon="clock"
            action={
              <PrimaryButton
                label="Подобрать занятие"
                onPress={() => router.push("/filters")}
              />
            }
          />
        }
        renderItem={({ item }) => {
          const activity = activities.find(
            (activity) => activity.id === item.activityId,
          );
          return (
            <View style={{ gap: 9 }}>
              <Text style={styles.date}>{dateLabel(item.createdAt)}</Text>
              {activity ? (
                <ActivityCard
                  activity={activity}
                  onPress={() =>
                    router.push({
                      pathname: "/activity/[id]",
                      params: { id: activity.id, historyId: item.id },
                    })
                  }
                  footer={
                    <>
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={styles.filters}>
                          {filtersLabel(item.filters)}
                        </Text>
                        {item.chosen && (
                          <View style={styles.chosen}>
                            <Feather
                              name="check-circle"
                              color={colors.primary}
                              size={13}
                            />
                            <Text style={styles.chosenText}>План выбран</Text>
                          </View>
                        )}
                      </View>
                      {!item.chosen && (
                        <IconButton
                          icon="check"
                          label={`Выбрать занятие: ${activity.title}`}
                          disabled={busy}
                          onPress={() => {
                            void chooseHistory(item.id);
                          }}
                        />
                      )}
                    </>
                  }
                />
              ) : (
                <View style={styles.unavailable}>
                  <Text style={styles.filters}>
                    Занятие больше не доступно в каталоге.
                  </Text>
                  <Text style={styles.filters}>
                    {filtersLabel(item.filters)}
                  </Text>
                  {item.chosen && (
                    <Text style={styles.chosenText}>План выбран</Text>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  date: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
    marginLeft: 4,
  },
  filters: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
    lineHeight: 18,
  },
  chosen: { flexDirection: "row", gap: 5, alignItems: "center" },
  chosenText: { fontFamily: fonts.bold, fontSize: 11, color: colors.primary },
  unavailable: {
    backgroundColor: colors.surface,
    padding: 20,
    gap: 10,
    borderRadius: 20,
  },
});
