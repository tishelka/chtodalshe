import type {
  Activity,
  HistoryEntry,
  Preferences,
  UserData,
} from "../types/domain";

export interface Repository {
  load(): Promise<UserData>;
  getActivities(): Promise<readonly Activity[]>;
  savePreferences(preferences: Preferences): Promise<void>;
  setFavorite(activityId: string, saved: boolean): Promise<void>;
  addHistory(entry: HistoryEntry): Promise<void>;
  setHistoryChosen(entryId: string, chosen: boolean): Promise<void>;
  clearHistory(): Promise<void>;
  dispose?(): void;
}
