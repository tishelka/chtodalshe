import { randomUUID } from "expo-crypto";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createRepository } from "../../lib/backend";
import type { Repository } from "../../data/repository";
import {
  recommend,
  type RecommendationResult,
} from "../recommendations/engine";
import {
  emptyUserData,
  type Activity,
  type Category,
  type Filters,
  type HistoryEntry,
  type UserData,
} from "../../types/domain";

export interface RecommendationSeries {
  filters: Filters;
  shownIds: string[];
  result: RecommendationResult;
  historyId: string | null;
}
interface ActionError {
  message: string;
  retry: () => Promise<boolean>;
}
interface AppContextValue {
  status: "loading" | "ready" | "error";
  loadError: string | null;
  actionError: ActionError | null;
  busy: boolean;
  data: UserData;
  activities: readonly Activity[];
  series: RecommendationSeries | null;
  reload: () => Promise<void>;
  dismissError: () => void;
  saveInterests: (
    interests: Category[],
    completeOnboarding?: boolean,
  ) => Promise<boolean>;
  setFavorite: (id: string, saved: boolean) => Promise<boolean>;
  chooseHistory: (id: string) => Promise<boolean>;
  clearHistory: () => Promise<boolean>;
  startSeries: (filters: Filters, remember?: boolean) => Promise<boolean>;
  nextRecommendation: (restart?: boolean) => Promise<boolean>;
}
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppContextValue["status"]>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ActionError | null>(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<UserData>(emptyUserData);
  const [activities, setActivities] = useState<readonly Activity[]>([]);
  const [series, setSeries] = useState<RecommendationSeries | null>(null);
  const repository = useRef<Repository | null>(null);
  const dataRef = useRef(data);
  const busyRef = useRef(false);
  const generation = useRef(0);

  const updateData = useCallback((update: (current: UserData) => UserData) => {
    const next = update(dataRef.current);
    dataRef.current = next;
    setData(next);
  }, []);

  const loadData = useCallback(async () => {
    const request = ++generation.current;
    setStatus("loading");
    setLoadError(null);
    setActionError(null);
    setSeries(null);
    repository.current?.dispose?.();
    repository.current = null;
    let repo: Repository | null = null;
    try {
      repo = createRepository();
      const results = await Promise.allSettled([
        repo.getActivities(),
        repo.load(),
      ]);
      if (request !== generation.current) {
        repo.dispose?.();
        return;
      }
      const [catalogResult, dataResult] = results;
      if (
        catalogResult.status === "rejected" ||
        (catalogResult.status === "fulfilled" && !catalogResult.value.length)
      )
        throw new Error("catalog");
      if (dataResult.status === "rejected") throw new Error("user-data");
      repository.current = repo;
      setActivities(catalogResult.value);
      updateData(() => dataResult.value);
      setStatus("ready");
    } catch {
      repo?.dispose?.();
      if (request !== generation.current) return;
      setLoadError(
        "Не удалось подключиться к серверу. Проверь соединение и повтори попытку.",
      );
      setStatus("error");
    }
  }, [updateData]);

  useEffect(() => {
    const lifecycleGeneration = generation;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadData();
    });
    return () => {
      cancelled = true;
      lifecycleGeneration.current++;
      repository.current?.dispose?.();
    };
  }, [loadData]);

  async function perform(
    work: (repo: Repository) => Promise<void>,
    message: string,
  ): Promise<boolean> {
    if (busyRef.current || !repository.current || status !== "ready")
      return false;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      await work(repository.current);
      return true;
    } catch {
      setActionError({ message, retry: () => perform(work, message) });
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function saveInterests(interests: Category[], completeOnboarding = false) {
    return perform(async (repo) => {
      const preferences = {
        ...dataRef.current.preferences,
        interests: [...new Set(interests)],
        onboardingCompleted:
          completeOnboarding || dataRef.current.preferences.onboardingCompleted,
      };
      await repo.savePreferences(preferences);
      updateData((current) => ({ ...current, preferences }));
    }, "Не удалось сохранить интересы. Попробуй ещё раз.");
  }
  function setFavorite(id: string, saved: boolean) {
    return perform(async (repo) => {
      await repo.setFavorite(id, saved);
      updateData((current) => ({
        ...current,
        favorites: saved
          ? [...new Set([...current.favorites, id])]
          : current.favorites.filter((item) => item !== id),
      }));
    }, "Не удалось сохранить изменение в избранном. Попробуй ещё раз.");
  }
  function chooseHistory(id: string) {
    return perform(async (repo) => {
      await repo.setHistoryChosen(id, true);
      updateData((current) => ({
        ...current,
        history: current.history.map((entry) =>
          entry.id === id ? { ...entry, chosen: true } : entry,
        ),
      }));
    }, "Не удалось отметить занятие в истории. Попробуй ещё раз.");
  }
  function clearHistory() {
    return perform(async (repo) => {
      await repo.clearHistory();
      updateData((current) => ({ ...current, history: [] }));
      setSeries((current) =>
        current ? { ...current, historyId: null } : current,
      );
    }, "Не удалось очистить историю. Попробуй ещё раз.");
  }

  function runRecommendation(
    filters: Filters,
    shownIds: string[],
    remember: boolean,
  ) {
    const result = recommend(
      activities,
      filters,
      dataRef.current.preferences.interests,
      shownIds,
    );
    const entry: HistoryEntry | null =
      result.kind === "success"
        ? {
            id: randomUUID(),
            activityId: result.recommendation.activity.id,
            createdAt: new Date().toISOString(),
            filters: { ...filters },
            chosen: false,
          }
        : null;
    return perform(async (repo) => {
      if (remember && result.kind !== "invalid") {
        const preferences = {
          ...dataRef.current.preferences,
          lastFilters: { ...filters },
        };
        await repo.savePreferences(preferences);
        updateData((current) => ({ ...current, preferences }));
      }
      if (entry) {
        await repo.addHistory(entry);
        updateData((current) => ({
          ...current,
          history: [
            entry,
            ...current.history.filter((item) => item.id !== entry.id),
          ],
        }));
      }
      setSeries({
        filters: { ...filters },
        result,
        shownIds: entry ? [...shownIds, entry.activityId] : shownIds,
        historyId: entry?.id ?? null,
      });
    }, "Не удалось сохранить подбор и историю. Повтори попытку.");
  }

  return (
    <AppContext.Provider
      value={{
        status,
        loadError,
        actionError,
        busy,
        data,
        activities,
        series,
        reload: loadData,
        dismissError: () => setActionError(null),
        saveInterests,
        setFavorite,
        chooseHistory,
        clearHistory,
        startSeries: (filters, remember = true) =>
          runRecommendation(filters, [], remember),
        nextRecommendation: (restart = false) =>
          series
            ? runRecommendation(
                series.filters,
                restart ? [] : series.shownIds,
                false,
              )
            : Promise.resolve(false),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppProvider missing");
  return context;
}
