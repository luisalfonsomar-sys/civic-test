import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { chevronLeft } from "../components/icons";
import { AMENDMENTS } from "../data/amendments";
import { CIVICS_QUESTIONS } from "../data/civicsData";

/** 1st, 2nd, 3rd, 4th... 11th/12th/13th are the standard exceptions (not 11st/12nd/13rd) since
 * English ordinals only follow the last-digit rule outside the 11-13 teens range. */
function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function AmendmentsScreen() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const amendment = AMENDMENTS[index];
  const relatedQuestions = amendment.relatedQuestionNums
    .map((num) => CIVICS_QUESTIONS.find((q) => q.num === num))
    .filter((q): q is (typeof CIVICS_QUESTIONS)[number] => Boolean(q));
  const progressPct = ((index + 1) / AMENDMENTS.length) * 100;
  const isFirst = index === 0;
  const isLast = index + 1 >= AMENDMENTS.length;

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
            <img alt="" className="size-6" src={chevronLeft} />
          </button>
          <div className="h-3 flex-1 shrink-0 overflow-hidden rounded-md bg-border">
            <div className="h-full bg-blue transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="whitespace-nowrap font-bold text-[12px] text-slate">
            {index + 1}/{AMENDMENTS.length}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-6 p-6">
          <div className="flex w-full shrink-0 items-center justify-between gap-3">
            <div className="flex shrink-0 items-start rounded-md bg-blue-tint px-2.5 py-1">
              <p className="font-bold text-[11px] uppercase text-blue">Amendments</p>
            </div>
            <p className="shrink-0 whitespace-nowrap font-bold text-[12px] text-slate">
              Ratified {amendment.ratified}
            </p>
          </div>

          <p className="w-full font-extrabold text-[22px] leading-[1.3] text-ink">
            {ordinal(amendment.number)} Amendment
            <span className="block font-bold text-[16px] text-slate">{amendment.title}</span>
          </p>

          <div className="flex w-full shrink-0 flex-col items-start gap-2 rounded-2xl border border-green bg-green-tint p-4">
            <p className="whitespace-nowrap font-bold text-[12px] uppercase text-green">Purpose</p>
            <p className="w-full font-semibold text-[15px] leading-[1.4] text-ink">
              {amendment.purpose}
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-2 rounded-2xl border border-border bg-white p-4">
            <p className="whitespace-nowrap font-bold text-[12px] uppercase text-blue">History</p>
            <p className="w-full text-[13px] leading-[1.4] text-slate">{amendment.history}</p>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-3 rounded-2xl border border-border bg-white p-4">
            <p className="whitespace-nowrap font-bold text-[12px] uppercase text-slate">
              On the Civics Test
            </p>
            {relatedQuestions.length === 0 ? (
              <p className="w-full text-[13px] leading-[1.4] text-slate">
                Not directly asked about on its own, but it's still part of the Constitution
                worth recognizing by number and purpose.
              </p>
            ) : (
              <div className="flex w-full shrink-0 flex-col items-start gap-3">
                {relatedQuestions.map((q) => (
                  <div
                    className="flex w-full shrink-0 flex-col items-start gap-1 rounded-xl bg-surface p-3"
                    key={q.num}
                  >
                    <p className="w-full font-bold text-[13px] leading-[1.4] text-ink">
                      Q{q.num}. {q.question}
                    </p>
                    <p className="w-full text-[13px] leading-[1.4] text-slate">
                      {q.answers[0]}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          className="flex flex-1 shrink-0 items-center justify-center rounded-2xl bg-ink p-4 disabled:opacity-40"
          disabled={isLast}
          onClick={() => setIndex((i) => Math.min(AMENDMENTS.length - 1, i + 1))}
          type="button"
        >
          <p className="whitespace-nowrap font-bold text-[16px] text-white">Next</p>
        </button>
      </div>
    </>
  );
}
