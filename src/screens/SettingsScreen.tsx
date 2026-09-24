import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { chevronLeft } from "../components/icons";
import { resetAllProgress } from "../lib/progress";
import { clearPin, getSettings, hasPin, setUse6520 } from "../lib/settings";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      aria-checked={checked}
      aria-label="Toggle"
      className={`relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-blue" : "bg-border"
      }`}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={`absolute size-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="w-full whitespace-nowrap font-bold text-[12px] uppercase text-slate">
      {children}
    </p>
  );
}

export function SettingsScreen() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(getSettings());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRemovePinConfirm, setShowRemovePinConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  function handleToggle6520(value: boolean) {
    setUse6520(value);
    setSettings(getSettings());
  }

  function handleRemovePin() {
    clearPin();
    setSettings(getSettings());
    setShowRemovePinConfirm(false);
  }

  function handleReset() {
    resetAllProgress();
    setShowResetConfirm(false);
    setResetDone(true);
  }

  return (
    <>
      <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
        <div className="sticky top-0 z-10 flex w-full shrink-0 items-center gap-4 bg-cream px-6 py-3">
          <button
            aria-label="Back"
            className="flex size-6 shrink-0 items-center justify-center"
            onClick={() => navigate(-1)}
            type="button"
          >
            <img alt="" className="size-6" src={chevronLeft} />
          </button>
          <p className="font-extrabold text-[20px] text-ink">Settings</p>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-8 p-6">
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <SectionLabel>Exam Preparation</SectionLabel>
            <div className="flex w-full shrink-0 items-start gap-3 rounded-2xl border border-border bg-white p-4">
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <p className="w-full font-bold text-[15px] text-ink">65/20 Consideration</p>
                <p className="w-full text-[13px] leading-[1.4] text-slate">
                  If you qualify for the 65+ / 20-year exception, turn this on to show that track
                  in Mock Setup — 10 questions drawn from the 20 marked questions, needing 6
                  correct to pass.
                </p>
              </div>
              <Toggle checked={settings.use6520} onChange={handleToggle6520} />
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <SectionLabel>Security</SectionLabel>
            <div className="flex w-full shrink-0 flex-col items-start gap-3 rounded-2xl border border-border bg-white p-4">
              <div className="flex w-full shrink-0 flex-col items-start gap-1">
                <p className="w-full font-bold text-[15px] text-ink">App Lock</p>
                <p className="w-full text-[13px] leading-[1.4] text-slate">
                  {hasPin()
                    ? "A PIN is required to open the app. The PIN is stored only on this device."
                    : "Set a PIN to require it before the app opens. Stored only on this device."}
                </p>
              </div>
              {hasPin() ? (
                <div className="flex w-full shrink-0 items-center gap-2">
                  <button
                    className="flex flex-1 shrink-0 items-center justify-center rounded-xl bg-ink p-3"
                    onClick={() => navigate("/settings/pin")}
                    type="button"
                  >
                    <p className="whitespace-nowrap font-bold text-[13px] text-white">
                      Change PIN
                    </p>
                  </button>
                  <button
                    className="flex flex-1 shrink-0 items-center justify-center rounded-xl bg-red-tint p-3"
                    onClick={() => setShowRemovePinConfirm(true)}
                    type="button"
                  >
                    <p className="whitespace-nowrap font-bold text-[13px] text-red">Remove PIN</p>
                  </button>
                </div>
              ) : (
                <button
                  className="flex w-full shrink-0 items-center justify-center rounded-xl bg-ink p-3"
                  onClick={() => navigate("/settings/pin")}
                  type="button"
                >
                  <p className="whitespace-nowrap font-bold text-[13px] text-white">Set a PIN</p>
                </button>
              )}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <SectionLabel>Data</SectionLabel>
            <div className="flex w-full shrink-0 flex-col items-start gap-3 rounded-2xl border border-red bg-red-tint p-4">
              <div className="flex w-full shrink-0 flex-col items-start gap-1">
                <p className="w-full font-bold text-[15px] text-ink">Reset All Progress</p>
                <p className="w-full text-[13px] leading-[1.4] text-slate">
                  Clears completed modules, category scores, the review queue, and your study
                  streak. This action can't be undone.
                </p>
              </div>
              <button
                className="flex w-full shrink-0 items-center justify-center rounded-xl bg-red p-3"
                onClick={() => setShowResetConfirm(true)}
                type="button"
              >
                <p className="whitespace-nowrap font-bold text-[13px] text-white">
                  Reset All Progress
                </p>
              </button>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <SectionLabel>About</SectionLabel>
            <button
              className="flex w-full shrink-0 items-center justify-between rounded-2xl border border-border bg-white p-4 text-left"
              onClick={() => navigate("/settings/privacy")}
              type="button"
            >
              <p className="font-bold text-[15px] text-ink">Privacy Policy</p>
              <p className="text-[18px] text-slate-light">›</p>
            </button>
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-ink/50 p-6"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="flex w-full max-w-[320px] flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-1">
              <p className="font-extrabold text-[18px] text-ink">Reset all progress?</p>
              <p className="text-[14px] leading-[1.4] text-slate">
                This clears every completed module, category score, review queue item, and your
                study streak. This action can't be undone.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <button
                className="w-full rounded-2xl bg-red p-3 font-bold text-white"
                onClick={handleReset}
                type="button"
              >
                Reset Everything
              </button>
              <button
                className="w-full rounded-2xl bg-border p-3 font-bold text-ink"
                onClick={() => setShowResetConfirm(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemovePinConfirm && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-ink/50 p-6"
          onClick={() => setShowRemovePinConfirm(false)}
        >
          <div
            className="flex w-full max-w-[320px] flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-1">
              <p className="font-extrabold text-[18px] text-ink">Remove App Lock?</p>
              <p className="text-[14px] leading-[1.4] text-slate">
                Anyone with access to this device will be able to open the app without a PIN.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <button
                className="w-full rounded-2xl bg-red p-3 font-bold text-white"
                onClick={handleRemovePin}
                type="button"
              >
                Remove PIN
              </button>
              <button
                className="w-full rounded-2xl bg-border p-3 font-bold text-ink"
                onClick={() => setShowRemovePinConfirm(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {resetDone && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-cream p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <p className="font-extrabold text-[26px] text-ink">Progress Reset</p>
            <p className="max-w-[280px] text-[15px] leading-[1.4] text-slate">
              All modules, scores, the review queue, and your streak have been cleared.
            </p>
          </div>
          <button
            className="w-full max-w-[280px] rounded-2xl bg-ink p-4 font-bold text-white"
            onClick={() => navigate("/")}
            type="button"
          >
            Back to Home
          </button>
        </div>
      )}
    </>
  );
}
