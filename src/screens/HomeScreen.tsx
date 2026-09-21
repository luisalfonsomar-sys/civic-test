import { useNavigate } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { StatusBar } from "../components/StatusBar";
import { calendarCheck, checkWhite, lock, star } from "../components/icons";
import { MODULES } from "../data/civicsData";
import { type ModuleStatus, getModuleStatus } from "../lib/progress";

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
          className="flex shrink-0 items-center justify-center rounded-[10px] bg-green px-3 py-1.5"
          onClick={() => navigate(`/lesson/${module.id}`)}
          type="button"
        >
          <p className="whitespace-nowrap font-bold text-[12px] text-white">REVIEW</p>
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
          className="flex shrink-0 items-center justify-center rounded-[10px] bg-red px-3 py-1.5"
          onClick={() => navigate(`/lesson/${module.id}`)}
          type="button"
        >
          <p className="whitespace-nowrap font-bold text-[12px] text-white">START</p>
        </button>
        <button
          className="flex size-20 shrink-0 items-center justify-center rounded-[40px] border-[6px] border-red bg-ink drop-shadow-[0px_6px_6px_rgba(0,0,0,0.08)]"
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

  return (
    <>
      <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
        <StatusBar />
        <AppHeader streak={14} hearts={5} />
        <div className="flex w-full shrink-0 flex-col items-start gap-6 px-6 pt-4 pb-8">
          <div className="flex w-full shrink-0 items-center gap-4 rounded-2xl bg-blue-tint p-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-3xl bg-blue">
              <img alt="" className="size-6" src={calendarCheck} />
            </div>
            <div className="flex min-w-px flex-1 shrink-0 flex-col items-start gap-1">
              <p className="whitespace-nowrap font-bold text-[16px] text-ink">Course Progress</p>
              <p className="w-full text-[13px] text-slate">
                {doneCount} of {MODULES.length} modules complete
              </p>
              <div className="flex h-2 w-full shrink-0 items-start overflow-hidden rounded pt-0.5">
                <div
                  className="h-full shrink-0 rounded bg-blue"
                  style={{ width: `${Math.round((doneCount / MODULES.length) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-2 rounded-[20px] bg-ink p-5">
            <p className="whitespace-nowrap font-bold text-[12px] uppercase text-blue">
              Module {currentModule.order} of {MODULES.length}
            </p>
            <p className="w-full font-bold text-[20px] text-white">{currentModule.category}</p>
            <p className="w-full text-[14px] text-slate-light">{currentModule.title}</p>
          </div>

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
      <BottomNav />
    </>
  );
}
