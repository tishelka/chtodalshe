import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { useApp } from "../preferences/AppProvider";
import { ActivityDetails } from "./ActivityCard";
import {
  EmptyState,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
} from "../../components/ui";
import { ActionNotice } from "../../components/ActionNotice";
export function ActivityScreen() {
  const { id, historyId } = useLocalSearchParams<{
    id: string;
    historyId?: string;
  }>();
  const { activities, data, setFavorite, chooseHistory, busy } = useApp();
  const router = useRouter();
  const activity = activities.find((item) => item.id === id);
  const history = data.history.find(
    (entry) => entry.id === historyId && entry.activityId === id,
  );
  if (!activity)
    return (
      <ScreenContainer>
        <PageHeader title="Занятие" back />
        <EmptyState
          title="Эта идея сейчас недоступна"
          description="Возможно, каталог обновился. Давай подберём другое занятие."
          action={
            <PrimaryButton
              label="Подобрать занятие"
              onPress={() => router.replace("/filters")}
            />
          }
        />
      </ScreenContainer>
    );
  const favorite = data.favorites.includes(id);
  return (
    <ScreenContainer>
      <PageHeader title="Хороший план" back />
      <ActionNotice />
      <ActivityDetails activity={activity} />
      <View style={{ gap: 12 }}>
        {history && (
          <PrimaryButton
            label={history.chosen ? "План выбран" : "Займусь этим"}
            icon="check"
            disabled={history.chosen || busy}
            onPress={() => {
              void chooseHistory(history.id);
            }}
          />
        )}
        <SecondaryButton
          label={favorite ? "В избранном" : "В избранное"}
          icon={favorite ? "check" : "heart"}
          disabled={busy}
          onPress={() => {
            void setFavorite(id, !favorite);
          }}
        />
      </View>
    </ScreenContainer>
  );
}
