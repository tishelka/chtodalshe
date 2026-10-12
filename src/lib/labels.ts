import type {
  ActivityLocation,
  Category,
  Filters,
  Mood,
} from "../types/domain";

export const categoryLabels: Record<Category, string> = {
  movies: "Кино и сериалы",
  video_games: "Видеоигры",
  board_games: "Настольные игры",
  walks: "Прогулки",
  sport: "Спорт",
  creativity: "Творчество",
  cooking: "Кулинария",
  reading: "Чтение",
  culture: "Культура и мероприятия",
  social: "Общение с друзьями",
};
export const locationLabels: Record<ActivityLocation | "any", string> = {
  home: "Дома",
  outdoors: "На улице",
  venue: "Куда-нибудь сходить",
  any: "Неважно",
};
export const moodLabels: Record<Mood | "any", string> = {
  calm: "Спокойного отдыха",
  active: "Активности",
  social: "Общения",
  creative: "Творчества",
  any: "Неважно",
};
export function durationLabel(minutes: number | null): string {
  if (minutes === null) return "Без ограничения времени";
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч${minutes % 60 ? ` ${minutes % 60} мин` : ""}`;
}
export function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? "человек" : count >= 2 && count <= 4 ? "человека" : "человек"}`;
}
export function filtersLabel(filters: Filters): string {
  return [
    filters.participants === null
      ? "Любая компания"
      : peopleLabel(filters.participants),
    durationLabel(filters.availableMinutes),
    locationLabels[filters.location].toLowerCase(),
  ].join(" · ");
}
export function costLabel(cost: number): string {
  return cost === 0
    ? "Бесплатно"
    : `≈ ${cost.toLocaleString("ru-RU")} ₽ / чел.`;
}
