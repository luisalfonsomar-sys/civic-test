import { useNavigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { calendarCheck, checkWhite, lock, star } from "../components/icons";
import { MODULES } from "../data/civicsData";
import { type ModuleStatus, getModuleStatus, getStreak } from "../lib/progress";

function LessonNode({
  module,
  status,
}: {
  module: (typeof MODULES)[number];
  status: ModuleStatus;
}) {
  const navigate = useNavigate();

  if (status === "done") {
    return (
      <div className="flex shrink-0 flex-col items-center">
        <button
          className="flex shrink-0 items-center justify-center rounded-[10px] bg-green-tint px-3 py-1.5"
          onClick={() => navigate(`/lesson/${module.id}`)}
          type="button"
        >
          <p className="whitespace-nowrap font-bold text-[12px] text-green">REVIEW</p>
        </button>
        <button
          className="flex size-[72px] shrink-0 items-center justify-center rounded-[36px] border-4 border-cream bg-green drop-shadow-[0px_4px_4px_rgba(0,0,0,0.06)]"
          onClick={() => navigate(`/lesson/${module.id}`)}
          type="button"
        >
          <img alt="" className="size-8" src={checkWhite} />
        </button>
        <p className="max-w-[140px] text-center font-bold text-[13px] text-green">
          {module.order}. {module.title}
        </p>
      </div>
    );
  }

  if (status === "active") {
    return (
      <div className="flex shrink-0 flex-col items-center">
        <button
          className="flex shrink-0 items-center justify-center rounded-[10px] bg-green-tint px-3 py-1.5"
          onClick={() => navigate(`/lesson/${module.id}`)}
          type="button"
        >
          <p className="whitespace-nowrap font-bold text-[12px] text-green">START</p>
        </button>
        <button
          className="flex size-20 shrink-0 items-center justify-center rounded-[40px] border-4 border-cream bg-green-light drop-shadow-[0px_6px_6px_rgba(0,0,0,0.08)]"
          onClick={() => navigate(`/lesson/${module.id}`)}
          type="button"
        >
          <img alt="" className="size-9" src={star} />
        </button>
        <p className="max-w-[160px] text-center font-extrabold text-[14px] text-ink">
          {module.order}. {module.title}
        </p>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="flex size-[72px] shrink-0 items-center justify-center rounded-[36px] bg-border">
        <img alt="" className="size-7" src={lock} />
      </div>
      <p className="max-w-[140px] text-center font-semibold text-[13px] text-slate-light">
        {module.order}. {module.title}
      </p>
    </div>
  );
}

export function HomeScreen() {
  const statuses = MODULES.map((m) => getModuleStatus(m.id));
  const activeIndex = statuses.findIndex((s) => s === "active");
  const doneCount = statuses.filter((s) => s === "done").length;
  const currentModule = MODULES[activeIndex === -1 ? MODULES.length - 1 : activeIndex];
  const donePct = Math.round((doneCount / MODULES.length) * 100);

  return (
    <div className="relative flex w-full flex-1 flex-col items-start overflow-hidden">
      <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
        <AppHeader streak={getStreak()} hearts={5} />

        <div className="sticky top-14 z-10 w-full shrink-0 bg-cream px-6 pt-4 pb-3">
          <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-4 rounded-2xl bg-blue-tint px-5 py-4">
            <div className="flex min-w-[140px] flex-1 shrink-0 items-center gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue">
                <img alt="" className="size-6" src={calendarCheck} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="whitespace-nowrap text-[13px] font-semibold text-slate">
                  {doneCount}/{MODULES.length} complete
                </p>
                <div className="flex h-2 w-full shrink-0 items-start overflow-hidden rounded bg-card">
                  <div className="h-full shrink-0 rounded bg-blue" style={{ width: `${donePct}%` }} />
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1 shrink-0 border-blue/20 pl-0 sm:border-l sm:pl-5">
              <p className="whitespace-nowrap text-[12px] font-bold uppercase text-blue">
                Module {currentModule.order}/{MODULES.length}
              </p>
              <p className="truncate text-[16px] font-bold text-ink">{currentModule.category}</p>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-6 px-6 pt-2 pb-8">
          <div className="flex w-full shrink-0 flex-col items-center gap-4">
            {MODULES.map((module, i) => (
              <div className="flex w-full shrink-0 flex-col items-center gap-4" key={module.id}>
                <LessonNode module={module} status={statuses[i]} />
                {i < MODULES.length - 1 && <div className="h-6 w-1.5 shrink-0 rounded bg-border" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[50px] backdrop-blur-sm"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black)",
        }}
      />
    </div>
  );
}
