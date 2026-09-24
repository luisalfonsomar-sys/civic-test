import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { chevronLeft } from "../components/icons";
import { MODULES } from "../data/civicsData";
import { explanationFor, parseRequiredSelections } from "../lib/quiz";

export function StudyModuleScreen() {
  const navigate = useNavigate();
  const { moduleId = "" } = useParams<{ moduleId: string }>();
  const module = MODULES.find((m) => m.id === moduleId);
  const questions = module?.questions ?? [];
  const [index, setIndex] = useState(0);

  if (!module || questions.length === 0) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-center font-bold text-ink">Nothing to study here yet.</p>
        <button
          className="rounded-2xl bg-primary px-6 py-3 text-white"
          onClick={() => navigate("/study")}
          type="button"
        >
          Back to Study
        </button>
      </div>
    );
  }

  const q = questions[index];
  const explanation = explanationFor(q);
  const requiredCount = parseRequiredSelections(q.question, q.answers.length);
  const progressPct = ((index + 1) / questions.length) * 100;
  const isFirst = index === 0;
  const isLast = index + 1 >= questions.length;

  return (
    <>
      <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
        <div className="sticky top-0 z-10 flex w-full shrink-0 items-center gap-4 bg-cream px-6 py-3">
          <button
            aria-label="Back to Study categories"
            className="flex size-6 shrink-0 items-center justify-center"
            onClick={() => navigate("/study")}
            type="button"
          >
            <img alt="" className="size-6 icon-invert" src={chevronLeft} />
          </button>
          <div className="h-3 flex-1 shrink-0 overflow-hidden rounded-md bg-border">
            <div className="h-full bg-blue transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="whitespace-nowrap font-bold text-[12px] text-slate">
            {index + 1}/{questions.length}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-6 p-6">
          <div className="flex shrink-0 items-start rounded-md bg-blue-tint px-2.5 py-1">
            <p className="font-bold text-[11px] uppercase text-blue">{module.title}</p>
          </div>
          <p className="w-full font-extrabold text-[22px] leading-[1.3] text-ink">
            Q{q.num}. {q.question}
          </p>

          <div className="flex w-full shrink-0 flex-col items-start gap-2 rounded-2xl border border-green bg-green-tint p-4">
            <p className="whitespace-nowrap font-bold text-[12px] uppercase text-green">
              Accepted Answer{q.answers.length > 1 ? "s" : ""}
              {q.answers.length > 1 && requiredCount < q.answers.length
                ? ` — any ${requiredCount}`
                : ""}
            </p>
            {q.answers.map((a) => (
              <p className="w-full font-bold text-[15px] leading-[1.4] text-ink" key={a}>
                {a}
              </p>
            ))}
          </div>

          {explanation && (
            <div className="flex w-full shrink-0 flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4">
              <p className="whitespace-nowrap font-bold text-[12px] uppercase text-blue">
                Why This Is Right
              </p>
              <p className="w-full text-[13px] leading-[1.4] text-slate">{explanation}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center gap-3 bg-cream p-6">
        <button
          className="flex flex-1 shrink-0 items-center justify-center rounded-2xl bg-border p-4 disabled:opacity-40"
          disabled={isFirst}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          type="button"
        >
          <p className="whitespace-nowrap font-bold text-[16px] text-ink">Previous</p>
        </button>
        <button
          className="flex flex-1 shrink-0 items-center justify-center rounded-2xl bg-primary p-4 disabled:opacity-40"
          disabled={isLast}
          onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
          type="button"
        >
          <p className="whitespace-nowrap font-bold text-[16px] text-white">Next</p>
        </button>
      </div>
    </>
  );
}
