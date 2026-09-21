import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { checkGreen, mic } from "../components/icons";
import { getStreak } from "../lib/progress";

export function MockSetupScreen() {
  const navigate = useNavigate();

  return (
    <>
      <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
        <ScreenHeader hearts={5} streak={getStreak()} title="Mock Interview" />
        <div className="flex w-full shrink-0 flex-col items-start gap-5 p-6">
          <p className="w-full font-extrabold text-[22px] text-ink">
            Official USCIS 2025 Exam Format
          </p>
          <p className="w-full text-[14px] leading-[1.4] text-slate">
            Simulate the real interview format: questions drawn at random from the full 128, one
            at a time, with instant feedback after each.
          </p>

          <div className="flex w-full shrink-0 flex-col items-start gap-3 rounded-[20px] border-2 border-blue bg-white p-5">
            <div className="flex shrink-0 items-start rounded-md bg-blue-tint px-2.5 py-1">
              <p className="whitespace-nowrap font-bold text-[11px] uppercase text-blue">
                Standard Track
              </p>
            </div>
            <p className="whitespace-nowrap font-bold text-[18px] text-ink">
              USCIS 100 Civics Questions
            </p>
            <div className="flex w-full shrink-0 flex-col items-start gap-2">
              <div className="flex w-full shrink-0 items-center gap-2">
                <img alt="" className="size-4 shrink-0" src={checkGreen} />
                <p className="min-w-0 flex-1 text-[14px] text-slate">
                  Up to <strong className="text-ink">20 questions</strong> asked randomly
                </p>
              </div>
              <div className="flex w-full shrink-0 items-center gap-2">
                <img alt="" className="size-4 shrink-0" src={checkGreen} />
                <p className="min-w-0 flex-1 text-[14px] text-slate">
                  Get <strong className="text-ink">12 correct</strong> answers to pass
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-3 rounded-[20px] border border-border bg-white p-5">
            <div className="flex shrink-0 items-start rounded-md bg-red-tint px-2.5 py-1">
              <p className="whitespace-nowrap font-bold text-[11px] uppercase text-red">
                65/20 Consideration
              </p>
            </div>
            <p className="whitespace-nowrap font-bold text-[18px] text-ink">
              Special Consideration
            </p>
            <p className="w-full text-[13px] leading-[1.4] text-slate">
              If you are <strong className="text-ink">65 years or older</strong> and have been a
              permanent resident for <strong className="text-ink">at least 20 years</strong>, you
              only study 20 marked questions and must pass 6 out of 10.
            </p>
            <div className="flex w-full shrink-0 items-center gap-2">
              <img alt="" className="size-4 shrink-0" src={checkGreen} />
              <p className="min-w-0 flex-1 text-[14px] text-slate">
                Simulates <strong className="text-ink">only</strong> the 20 marked questions
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-3 rounded-[20px] border border-border bg-white p-5">
            <div className="flex shrink-0 items-start rounded-md bg-green-tint px-2.5 py-1">
              <p className="whitespace-nowrap font-bold text-[11px] uppercase text-green">
                Live Interview Simulation
              </p>
            </div>
            <p className="whitespace-nowrap font-bold text-[18px] text-ink">
              A Real Person Interviews You
            </p>
            <p className="w-full text-[13px] leading-[1.4] text-slate">
              An officer asks each question out loud, and you answer by speaking — just like the
              real interview. No multiple choice — just your voice, with a chance to retry if a
              word doesn't come out right.
            </p>
            <div className="flex w-full shrink-0 flex-col items-start gap-2">
              <div className="flex w-full shrink-0 items-center gap-2">
                <img alt="" className="size-4 shrink-0" src={checkGreen} />
                <p className="min-w-0 flex-1 text-[14px] text-slate">
                  <strong className="text-ink">20 questions</strong>, asked one at a time
                </p>
              </div>
              <div className="flex w-full shrink-0 items-center gap-2">
                <img alt="" className="size-4 shrink-0" src={checkGreen} />
                <p className="min-w-0 flex-1 text-[14px] text-slate">
                  You <strong className="text-ink">record your response</strong> out loud
                </p>
              </div>
            </div>
            <button
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-ink p-4"
              onClick={() => navigate("/interview")}
              type="button"
            >
              <img alt="" className="size-4" src={mic} />
              <p className="whitespace-nowrap font-bold text-[15px] text-white">
                Start Live Interview
              </p>
            </button>
          </div>
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col items-start bg-cream p-6">
        <button
          className="flex w-full shrink-0 items-center justify-center rounded-2xl bg-ink p-4"
          onClick={() => navigate("/lesson/mock")}
          type="button"
        >
          <p className="whitespace-nowrap font-bold text-[16px] text-white">
            Begin Mock Interview
          </p>
        </button>
      </div>
      <BottomNav />
    </>
  );
}
