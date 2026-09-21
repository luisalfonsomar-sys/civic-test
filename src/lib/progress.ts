import { MODULES } from "../data/civicsData";

const STORAGE_KEY = "great-abe-progress-v1";

type ModuleScore = { correct: number; total: number };

type ProgressState = {
  completedModules: string[];
  moduleScores: Record<string, ModuleScore>;
  missedQuestionNums: number[];
  streakCount: number;
  lastActiveDate: string | null;
};

const EMPTY_STATE: ProgressState = {
  completedModules: [],
  moduleScores: {},
  missedQuestionNums: [],
  streakCount: 0,
  lastActiveDate: null,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(b) - Date.parse(a)) / msPerDay);
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch {
    // ignore — fall through to empty state
  }
  return { ...EMPTY_STATE };
}

function save(state: ProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode, etc.) — silently skip persistence
  }
}

export function getProgress(): ProgressState {
  return load();
}

export type ModuleStatus = "done" | "active" | "locked";

export function getModuleStatus(moduleId: string): ModuleStatus {
  const state = load();
  if (state.completedModules.includes(moduleId)) return "done";
  const idx = MODULES.findIndex((m) => m.id === moduleId);
  const prevModule = MODULES[idx - 1];
  if (!prevModule || state.completedModules.includes(prevModule.id)) return "active";
  return "locked";
}

export function recordModuleResult(
  moduleId: string,
  correct: number,
  total: number,
  missedNums: number[],
  correctedNums: number[],
) {
  const state = load();
  const prior = state.moduleScores[moduleId] ?? { correct: 0, total: 0 };
  state.moduleScores[moduleId] = {
    correct: prior.correct + correct,
    total: prior.total + total,
  };
  if (!state.completedModules.includes(moduleId) && total > 0 && correct / total >= 0.6) {
    state.completedModules.push(moduleId);
  }
  const missed = new Set(state.missedQuestionNums);
  for (const n of missedNums) missed.add(n);
  for (const n of correctedNums) missed.delete(n);
  state.missedQuestionNums = Array.from(missed);
  save(state);
}

export function getCategoryMastery(): { label: string; pct: number; started: boolean }[] {
  const state = load();
  const groups: Record<string, string[]> = {
    "American Government": ["gov-principles", "gov-system", "gov-rights"],
    "American History": ["history-founding", "history-modern"],
    "Symbols & Holidays": ["symbols-holidays"],
  };
  return Object.entries(groups).map(([label, moduleIds]) => {
    let correct = 0;
    let total = 0;
    for (const id of moduleIds) {
      const s = state.moduleScores[id];
      if (s) {
        correct += s.correct;
        total += s.total;
      }
    }
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { label, pct, started: total > 0 };
  });
}

export function getOverallAccuracy(): { pct: number; started: boolean } {
  const state = load();
  let correct = 0;
  let total = 0;
  for (const s of Object.values(state.moduleScores)) {
    correct += s.correct;
    total += s.total;
  }
  return { pct: total > 0 ? Math.round((correct / total) * 100) : 0, started: total > 0 };
}

export function getReviewQueueCount(): number {
  return load().missedQuestionNums.length;
}

/**
 * Call once per app load. Increments the streak the first time a given calendar day is seen,
 * resets it to 1 if a day was skipped, and leaves it alone on repeat visits the same day.
 */
export function touchStreak(): number {
  const state = load();
  const today = todayKey();
  if (state.lastActiveDate === today) return state.streakCount;

  state.streakCount =
    state.lastActiveDate && daysBetween(state.lastActiveDate, today) === 1
      ? state.streakCount + 1
      : 1;
  state.lastActiveDate = today;
  save(state);
  return state.streakCount;
}

export function getStreak(): number {
  return load().streakCount;
}
