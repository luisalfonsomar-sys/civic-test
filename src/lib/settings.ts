const STORAGE_KEY = "civik-settings-v1";

type SettingsState = {
  /** Self-declared eligibility for the 65/20 exception — gates whether that track even appears
   * in Mock Setup, since it isn't something every learner qualifies for. */
  use6520: boolean;
  /** SHA-256 hex digest of `${salt}:${pin}`, or null if no app lock is set. */
  pinHash: string | null;
  /** Random per-install salt, generated once when a PIN is first set. */
  pinSalt: string | null;
};

const EMPTY_STATE: SettingsState = {
  use6520: false,
  pinHash: null,
  pinSalt: null,
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

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function digest(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hasPin(): boolean {
  return load().pinHash !== null;
}

/** Sets (or replaces) the app-lock PIN. The raw PIN is never stored — only a salted SHA-256
 * digest, so a peek at localStorage doesn't reveal it. */
export async function setPin(pin: string): Promise<void> {
  const salt = randomSalt();
  const pinHash = await digest(`${salt}:${pin}`);
  const state = load();
  state.pinSalt = salt;
  state.pinHash = pinHash;
  save(state);
}

export function clearPin() {
  const state = load();
  state.pinHash = null;
  state.pinSalt = null;
  save(state);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const state = load();
  if (!state.pinHash || !state.pinSalt) return false;
  const candidate = await digest(`${state.pinSalt}:${pin}`);
  return candidate === state.pinHash;
}
