import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { alarmClock, gear } from "../components/icons";
import {
  getCategoryMastery,
  getOverallAccuracy,
  getReviewQueueCount,
  getStreak,
} from "../lib/progress";

const BAR_COLORS = ["bg-blue", "bg-red", "bg-yellow"];

export function ProgressScreen() {
  const navigate = useNavigate();
  const categories = getCategoryMastery();
  const accuracy = getOverallAccuracy();
  const reviewCount = getReviewQueueCount();
  const streak = getStreak();

  return (
    <>
      <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
        <ScreenHeader hearts={5} streak={streak} title="Mastery Tracker" />
        <div className="flex w-full shrink-0 flex-col items-start gap-6 p-6">
          <div className="flex w-full shrink-0 items-start gap-3">
            <div className="flex min-w-px flex-1 shrink-0 flex-col items-start gap-1 rounded-2xl bg-blue-tint p-4">
              <p className="whitespace-nowrap font-semibold text-[13px] text-slate">Accuracy</p>
              <p className="whitespace-nowrap font-extrabold text-[28px] text-blue">
                {accuracy.started ? `${accuracy.pct}%` : "N/A"}
              </p>
              <p className="whitespace-nowrap text-[11px] text-slate">
                {accuracy.started ? "All-time" : "Complete a lesson to start"}
              </p>
            </div>
            <div className="flex min-w-px flex-1 shrink-0 flex-col items-start gap-1 rounded-2xl bg-red-tint p-4">
              <p className="whitespace-nowrap font-semibold text-[13px] text-slate">
                Study Streak
              </p>
              <p className="whitespace-nowrap font-extrabold text-[28px] text-red">
                {streak} {streak === 1 ? "Day" : "Days"}
              </p>
              <p className="whitespace-nowrap text-[11px] text-slate">Keep it up!</p>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-4 rounded-[20px] border border-border bg-card p-5">
            <p className="whitespace-nowrap font-extrabold text-[16px] text-ink">
              Category Mastery
            </p>
            <div className="flex w-full shrink-0 flex-col items-start gap-4">
              {categories.map((c, i) => (
                <div className="flex w-full shrink-0 flex-col items-start gap-1.5" key={c.label}>
                  <div className="flex w-full shrink-0 items-start justify-between">
                    <p className="whitespace-nowrap font-bold text-[14px] text-ink">{c.label}</p>
                    <p
                      className={`whitespace-nowrap font-bold text-[14px] ${c.started ? "text-ink" : "text-slate-light"}`}
                    >
                      {c.started ? `${c.pct}%` : "Not started"}
                    </p>
                  </div>
                  <div className="flex h-2 w-full shrink-0 items-start overflow-hidden rounded bg-border">
                    {c.started && (
                      <div
                        className={`h-full shrink-0 rounded ${BAR_COLORS[i % BAR_COLORS.length]}`}
                        style={{ width: `${c.pct}%` }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            className="flex w-full shrink-0 items-center gap-4 rounded-2xl bg-blue-tint p-4 text-left disabled:opacity-60"
            disabled={reviewCount === 0}
            onClick={() => navigate("/oral-practice")}
            type="button"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[20px] bg-red">
              <img alt="" className="size-5" src={alarmClock} />
            </div>
            <div className="flex min-w-px flex-1 shrink-0 flex-col items-start gap-0.5">
              <p className="w-full font-bold text-[15px] text-ink">
                Review Queue: {reviewCount} Questions
              </p>
              <p className="w-full text-[12px] text-slate">
                Strengthen weak answers from incorrect practice.
              </p>
            </div>
          </button>

          <button
            className="flex w-full shrink-0 items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left"
            onClick={() => navigate("/settings")}
            type="button"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[20px] bg-primary">
              <img alt="" className="size-5" src={gear} />
            </div>
            <div className="flex min-w-px flex-1 shrink-0 flex-col items-start gap-0.5">
              <p className="w-full font-bold text-[15px] text-ink">Settings</p>
              <p className="w-full text-[12px] text-slate">
                Theme, 65/20 track, reset progress, and privacy.
              </p>
            </div>
          </button>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
