import type {
  Activity,
  DataMode,
  HistoryEntry,
  Preferences,
  UserData,
} from "../types/domain";

export interface Repository {
  readonly mode: DataMode;
  load(): Promise<UserData>;
  getActivities(): Promise<readonly Activity[]>;
  savePreferences(preferences: Preferences): Promise<void>;
  setFavorite(activityId: string, saved: boolean): Promise<void>;
  addHistory(entry: HistoryEntry): Promise<void>;
  setHistoryChosen(entryId: string, chosen: boolean): Promise<void>;
  clearHistory(): Promise<void>;
  dispose?(): void;
}
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
