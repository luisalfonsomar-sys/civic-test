const STORAGE_KEY = "civik-settings-v1";

export type Theme = "light" | "dark" | "system";

type SettingsState = {
  /** Self-declared eligibility for the 65/20 exception — gates whether that track even appears
   * in Mock Setup, since it isn't something every learner qualifies for. */
  use6520: boolean;
  /** "system" follows the OS/browser preference; "light"/"dark" overrides it. */
  theme: Theme;
};

const EMPTY_STATE: SettingsState = {
  use6520: false,
  theme: "system",
};

function load(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch {
    // ignore — fall through to empty state
  }
  return { ...EMPTY_STATE };
}

function save(state: SettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode, etc.) — silently skip persistence
  }
}

export function getSettings(): SettingsState {
  return load();
}

export function setUse6520(value: boolean) {
  const state = load();
  state.use6520 = value;
  save(state);
}

/** Applies `theme` to the document root as the `data-theme` attribute that index.css's dark-mode
 * selectors key off of. "system" removes the attribute entirely so the OS-preference media query
 * takes over; "light"/"dark" set it explicitly, overriding the OS either way. Safe to call before
 * any React render (e.g. at module load) since it only touches the DOM, not React state. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function setTheme(theme: Theme) {
  const state = load();
  state.theme = theme;
  save(state);
  applyTheme(theme);
}
