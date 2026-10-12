import { useRouter } from "expo-router";
import {
  EmptyState,
  PrimaryButton,
  ScreenContainer,
} from "../src/components/ui";
export default function NotFound() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <EmptyState
        title="Такого экрана нет"
        description="Вернёмся к твоим идеям."
        action={
          <PrimaryButton
            label="На главную"
            onPress={() => router.replace("/")}
          />
        }
      />
    </ScreenContainer>
  );
}
