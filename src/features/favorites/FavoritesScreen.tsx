import { useRouter } from "expo-router";
import { FlatList, Text, StyleSheet, View } from "react-native";
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
import { colors, fonts } from "../../theme/tokens";
export function FavoritesScreen() {
  const { data, activities, setFavorite, busy } = useApp();
  const router = useRouter();
  const favorites = data.favorites.map((id) => ({
    id,
    activity: activities.find((activity) => activity.id === id),
  }));
  return (
    <ScreenContainer scroll={false} style={{ paddingBottom: 0 }}>
      <PageHeader
        title="Избранное"
        subtitle="Хорошие идеи, которые хочется сохранить."
      />
      <ActionNotice />
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingBottom: 32, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            title="Здесь пока пусто"
            description="Сохраняй интересные занятия, чтобы не потерять их."
            icon="heart"
            action={
              <PrimaryButton
                label="Найти свою идею"
                onPress={() => router.push("/filters")}
              />
            }
          />
        }
        renderItem={({ item }) =>
          item.activity ? (
            <ActivityCard
              activity={item.activity}
              onPress={() =>
                router.push({
                  pathname: "/activity/[id]",
                  params: { id: item.id },
                })
              }
              footer={
                <>
                  <Text style={styles.saved}>Сохранено для тебя</Text>
                  <IconButton
                    icon="trash-2"
                    label={`Удалить из избранного: ${item.activity.title}`}
                    disabled={busy}
                    onPress={() => {
                      void setFavorite(item.id, false);
                    }}
                  />
                </>
              }
            />
          ) : (
            <View style={styles.unavailable}>
              <Text style={styles.saved}>
                Это занятие больше не доступно в каталоге.
              </Text>
              <IconButton
                icon="trash-2"
                label="Удалить недоступное занятие"
                disabled={busy}
                onPress={() => {
                  void setFavorite(item.id, false);
                }}
              />
            </View>
          )
        }
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  saved: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    flex: 1,
  },
  unavailable: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
