import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "../components/AppHeader";
import { checkGreen, mic } from "../components/icons";
import { getStreak } from "../lib/progress";
import { getSettings } from "../lib/settings";

export function MockSetupScreen() {
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const use6520 = getSettings().use6520;
  const slideCount = use6520 ? 3 : 2;

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = track.clientWidth;
    if (slideWidth === 0) return;
    setActiveSlide(Math.round(track.scrollLeft / slideWidth));
  }

  function scrollToSlide(i: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * i, behavior: "smooth" });
  }

  return (
    <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
      <ScreenHeader hearts={5} streak={getStreak()} title="Mock Interview" />
        <div className="flex w-full shrink-0 flex-col items-start gap-4 pt-6">
          <div className="flex w-full shrink-0 flex-col items-start gap-1 px-6">
            <p className="w-full font-extrabold text-[22px] text-ink">
              2025 Citizenship Exam Format
            </p>
            <p className="w-full text-[14px] leading-[1.4] text-slate">
              Swipe from rookie to expert — pick whichever level fits how you want to practice.
            </p>
            {!use6520 && (
              <button
                className="mt-1 text-left text-[12px] font-semibold text-blue"
                onClick={() => navigate("/settings")}
                type="button"
              >
                Qualify for the 65/20 exception? Enable it in Settings.
              </button>
            )}
          </div>

          <div className="flex w-full shrink-0 items-center justify-center gap-2">
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 shrink-0 rounded-full transition-all ${
                  activeSlide === i ? "w-6 bg-primary" : "w-1.5 bg-border"
                }`}
                key={i}
                onClick={() => scrollToSlide(i)}
                type="button"
              />
            ))}
          </div>

          <div
            className="no-scrollbar flex w-full shrink-0 snap-x snap-mandatory overflow-x-auto"
            onScroll={handleScroll}
            ref={trackRef}
          >
            {/* Slide 1: 65/20 Consideration — Rookie — only shown once enabled in Settings, since
                not every learner qualifies for this track. */}
            {use6520 && (
              <div className="w-full shrink-0 snap-center px-6 pb-2">
                <div
                  className="animate-slide-in-left flex w-full shrink-0 flex-col items-start gap-3 rounded-[20px] border border-border bg-card p-5"
                  style={{ animationDelay: "0ms" }}
                >
                  <div className="flex w-full shrink-0 flex-wrap items-center gap-2">
                    <div className="flex shrink-0 items-start rounded-md bg-red-tint px-2.5 py-1">
                      <p className="whitespace-nowrap font-bold text-[11px] uppercase text-red">
                        65/20 Consideration
                      </p>
                    </div>
                    <div className="flex shrink-0 items-start rounded-md bg-surface px-2.5 py-1">
                      <p className="whitespace-nowrap font-bold text-[11px] uppercase text-slate">
                        Rookie
                      </p>
                    </div>
                  </div>
                  <p className="w-full font-bold text-[18px] leading-[1.25] text-ink">
                    For 65 Years or Older
                  </p>
                  <p className="w-full text-[13px] leading-[1.4] text-slate">
                    If you are <strong className="text-ink">65 years or older</strong> and have
                    held that status for <strong className="text-ink">at least 20 years</strong>,
                    you only study 20 marked questions and must pass 6 out of 10.
                  </p>
                  <div className="flex w-full shrink-0 items-center gap-2">
                    <img alt="" className="size-4 shrink-0" src={checkGreen} />
                    <p className="min-w-0 flex-1 text-[14px] text-slate">
                      Tests <strong className="text-ink">10 of the 20</strong> marked questions
                    </p>
                  </div>
                  <button
                    className="flex w-full shrink-0 items-center justify-center rounded-2xl bg-primary p-4"
                    onClick={() => navigate("/lesson/mock-6520")}
                    type="button"
                  >
                    <p className="whitespace-nowrap font-bold text-[15px] text-white">
                      Begin Mock Interview
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Slide 2: Standard Track (multiple choice / selecting) — Veteran */}
            <div className="w-full shrink-0 snap-center px-6 pb-2">
              <div
                className="animate-slide-in-left flex w-full shrink-0 flex-col items-start gap-3 rounded-[20px] border-2 border-blue bg-card p-5"
                style={{ animationDelay: "80ms" }}
              >
                <div className="flex w-full shrink-0 flex-wrap items-center gap-2">
                  <div className="flex shrink-0 items-start rounded-md bg-blue-tint px-2.5 py-1">
                    <p className="whitespace-nowrap font-bold text-[11px] uppercase text-blue">
                      Standard Track
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start rounded-md bg-surface px-2.5 py-1">
                    <p className="whitespace-nowrap font-bold text-[11px] uppercase text-slate">
                      Veteran
                    </p>
                  </div>
                </div>
                <p className="w-full font-bold text-[18px] leading-[1.25] text-ink">
                  Selecting — 100 Civics Questions
                </p>
                <p className="w-full text-[13px] leading-[1.4] text-slate">
                  Pick your answer from multiple-choice options, one question at a time, with
                  instant feedback after each.
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
                <button
                  className="flex w-full shrink-0 items-center justify-center rounded-2xl bg-primary p-4"
                  onClick={() => navigate("/lesson/mock")}
                  type="button"
                >
                  <p className="whitespace-nowrap font-bold text-[15px] text-white">
                    Begin Mock Interview
                  </p>
                </button>
              </div>
            </div>

            {/* Slide 3: Live Interview Simulation (spoken) — Expert */}
            <div className="w-full shrink-0 snap-center px-6 pb-2">
              <div
                className="animate-slide-in-left flex w-full shrink-0 flex-col items-start gap-3 rounded-[20px] border-2 border-green bg-card p-5"
                style={{ animationDelay: "160ms" }}
              >
                <div className="flex w-full shrink-0 flex-wrap items-center gap-2">
                  <div className="flex shrink-0 items-start rounded-md bg-green-tint px-2.5 py-1">
                    <p className="whitespace-nowrap font-bold text-[11px] uppercase text-green">
                      Live Interview Simulation
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start rounded-md bg-surface px-2.5 py-1">
                    <p className="whitespace-nowrap font-bold text-[11px] uppercase text-slate">
                      Expert
                    </p>
                  </div>
                </div>
                <p className="w-full font-bold text-[18px] leading-[1.25] text-ink">
                  Spoken — A Simulated Interviewer Asks You
                </p>
                <p className="w-full text-[13px] leading-[1.4] text-slate">
                  A simulated interviewer asks each question out loud, and you answer by speaking —
                  just like the real interview. No multiple choice — just your voice, with a
                  chance to retry if a word doesn't come out right.
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
                  className="flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary p-4"
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
        </div>
      </div>
  );
}

