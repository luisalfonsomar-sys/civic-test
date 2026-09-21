import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { MODULES } from "../data/civicsData";
import { getStreak } from "../lib/progress";

export function StudyScreen() {
  const navigate = useNavigate();

  return (
    <>
      <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
        <ScreenHeader hearts={5} streak={getStreak()} title="Study" />
        <div className="flex w-full shrink-0 flex-col items-start gap-5 p-6">
          <p className="w-full text-[14px] leading-[1.4] text-slate">
            Browse every question and its accepted answer by category — no quiz, no pressure,
            just review the material at your own pace.
          </p>
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            {MODULES.map((module) => (
              <button
                className="flex w-full shrink-0 items-center gap-3 rounded-2xl border border-border bg-white p-4 text-left"
                key={module.id}
                onClick={() => navigate(`/study/${module.id}`)}
                type="button"
              >
                <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <p className="whitespace-nowrap font-bold text-[11px] uppercase text-blue">
                    {module.category}
                  </p>
                  <p className="w-full font-bold text-[16px] text-ink">{module.title}</p>
                  <p className="w-full text-[13px] text-slate">
                    {module.questions.length} question{module.questions.length === 1 ? "" : "s"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
