import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { award, chevronLeft, mic } from "../components/icons";
import { type CivicsQuestion, CIVICS_QUESTIONS } from "../data/civicsData";
import { getProgress, markQuestionCorrected } from "../lib/progress";
import { explanationFor } from "../lib/quiz";
import { evaluateSpeech, type SpeechEvaluation } from "../lib/speechMatch";
import { useMicLevels } from "../lib/useMicLevels";
import { useSpeechRecognition } from "../lib/useSpeechRecognition";

const BAR_COUNT = 7;
const BAR_MIN_PX = 6;
const BAR_MAX_PX = 34;

function pickPracticeQuestion(exclude?: number): CivicsQuestion {
  const { missedQuestionNums } = getProgress();
  const missedPool = CIVICS_QUESTIONS.filter(
    (q) => missedQuestionNums.includes(q.num) && !q.personalized,
  );
  const basePool = missedPool.length > 0 ? missedPool : CIVICS_QUESTIONS.filter((q) => q.starred);
  const pool = basePool.length > 1 ? basePool.filter((q) => q.num !== exclude) : basePool;
  return pool[Math.floor(Math.random() * pool.length)];
}

const VERDICT_STYLES = {
  correct: { bg: "bg-green-tint", border: "border-green", text: "text-green", label: "Nailed it!" },
  close: {
    bg: "bg-[#fff6e0]",
    border: "border-yellow",
    text: "text-[#8a6d00]",
    label: "Close — keep practicing",
  },
  incorrect: { bg: "bg-red-tint", border: "border-red", text: "text-red", label: "Not quite" },
} as const;

export function OralPracticeScreen() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState<CivicsQuestion>(() => pickPracticeQuestion());
  const [result, setResult] = useState<SpeechEvaluation | null>(null);
  const { supported, status, transcript, start, stop, reset } = useSpeechRecognition();

  const listening = status === "listening";
  const micLevels = useMicLevels(listening, BAR_COUNT);

  // Recognition ends when the user taps the mic to stop (continuous=true keeps it open through
  // pauses until then) — evaluate here, once, whenever it actually ends with something said.
  useEffect(() => {
    if (status === "idle" && transcript.trim() && !result) {
      const evaluation = evaluateSpeech(transcript, question.answers);
      setResult(evaluation);
      // A correct spoken answer clears this question from the review queue right away —
      // otherwise a question you'd already gotten right here would keep coming back forever.
      if (evaluation.verdict === "correct") {
        markQuestionCorrected(question.num);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, transcript]);

  function handleMicTap() {
    if (listening) {
      stop();
      return;
    }
    setResult(null);
    start();
  }

  function handleTryAgain() {
    reset();
    setResult(null);
  }

  function handleNextQuestion() {
    setQuestion((prev) => pickPracticeQuestion(prev.num));
    reset();
    setResult(null);
  }

  const verdict = result ? VERDICT_STYLES[result.verdict] : null;

  return (
    <>
      <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
        <div className="sticky top-0 z-10 flex w-full shrink-0 items-center justify-between bg-cream px-6 py-3">
          <button
            className="flex shrink-0 items-center gap-2"
            onClick={() => navigate(-1)}
            type="button"
          >
            <img alt="" className="size-6" src={chevronLeft} />
            <p className="whitespace-nowrap font-bold text-[16px] text-ink">
              Question {question.num}
            </p>
          </button>
          <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-tint px-3 py-1.5">
            <img alt="" className="size-4" src={award} />
            <p className="whitespace-nowrap font-bold text-[13px] text-blue">280 XP</p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-6 p-6">
          <div className="flex shrink-0 items-start rounded-md bg-red-tint px-2.5 py-1">
            <p className="whitespace-nowrap font-bold text-[11px] uppercase text-red">
              Oral Practice Mode
            </p>
          </div>
          <p className="w-full font-extrabold text-[22px] leading-[1.3] text-ink">
            {question.question}
          </p>
          <div className="flex w-full shrink-0 flex-col items-start gap-2 rounded-2xl bg-surface p-4">
            <p className="whitespace-nowrap font-bold text-[12px] uppercase text-slate">
              Accepted Response
            </p>
            <p className="w-full font-bold text-[15px] text-ink">"{question.answers[0]}"</p>
            {explanationFor(question) && (
              <p className="w-full text-[13px] leading-[1.4] text-slate">{explanationFor(question)}</p>
            )}
          </div>

          {!supported ? (
            <div className="flex w-full shrink-0 flex-col items-start gap-2 rounded-2xl border border-border bg-white p-4">
              <p className="font-bold text-[14px] text-ink">
                Speech recognition isn't available in this browser.
              </p>
              <p className="text-[13px] text-slate">
                Try Chrome on desktop or Android to practice by speaking your answer aloud.
              </p>
            </div>
          ) : (
            <div className="flex w-full shrink-0 flex-col items-center gap-4 rounded-[20px] border border-border bg-white p-6">
              <p className="whitespace-nowrap font-semibold text-[13px] text-slate-light">
                {status === "listening"
                  ? "Listening to your response..."
                  : status === "denied"
                    ? "Microphone access denied"
                    : status === "no-speech"
                      ? "Didn't catch that — try again"
                      : "Tap the mic and say your answer"}
              </p>
              <div className="flex h-10 shrink-0 items-center gap-1.5">
                {micLevels.map((level, i) => (
                  <div
                    className={`w-1 shrink-0 rounded-sm transition-[height] duration-75 ${
                      listening ? ((i === 2 || i === 5) ? "bg-red" : "bg-blue") : "bg-border"
                    }`}
                    key={i}
                    style={{ height: `${listening ? BAR_MIN_PX + level * (BAR_MAX_PX - BAR_MIN_PX) : BAR_MIN_PX}px` }}
                  />
                ))}
              </div>
              <p className="w-full text-center font-bold text-[16px] text-ink">
                {transcript ? `"${transcript}"` : listening ? "..." : " "}
              </p>
            </div>
          )}

          {result && verdict && (
            <div
              className={`flex w-full shrink-0 flex-col items-start gap-2 rounded-2xl border-2 p-4 ${verdict.bg} ${verdict.border}`}
            >
              <p className={`whitespace-nowrap font-extrabold text-[16px] ${verdict.text}`}>
                {verdict.label}
              </p>
              <p className="w-full text-[13px] text-ink">
                You said: <span className="font-semibold">"{transcript}"</span>
              </p>
              {result.verdict !== "correct" && (
                <p className="w-full text-[13px] text-ink">
                  Accepted: <span className="font-semibold">"{result.matchedAnswer}"</span>
                </p>
              )}
              <div className="mt-1 flex w-full shrink-0 gap-3">
                <button
                  className="flex flex-1 shrink-0 items-center justify-center rounded-xl bg-ink p-3"
                  onClick={handleTryAgain}
                  type="button"
                >
                  <p className="whitespace-nowrap font-bold text-[14px] text-white">Try Again</p>
                </button>
                <button
                  className="flex flex-1 shrink-0 items-center justify-center rounded-xl bg-blue p-3"
                  onClick={handleNextQuestion}
                  type="button"
                >
                  <p className="whitespace-nowrap font-bold text-[14px] text-white">
                    Next Question
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {supported && (
        <div className="flex w-full shrink-0 flex-col items-center gap-4 rounded-t-3xl bg-surface p-8">
          <button
            className="flex size-[88px] shrink-0 items-center justify-center rounded-[44px] bg-red-tint disabled:opacity-50"
            disabled={status === "denied"}
            onClick={handleMicTap}
            type="button"
          >
            <div
              className={`flex size-[68px] shrink-0 items-center justify-center rounded-[34px] bg-red drop-shadow-[0px_8px_8px_rgba(255,107,107,0.31)] ${
                listening ? "animate-pulse" : ""
              }`}
            >
              <img alt="" className="size-8" src={mic} />
            </div>
          </button>
          <p className="whitespace-nowrap font-bold text-[14px] text-red">
            {listening ? "TAP TO EVALUATE" : "TAP TO SPEAK"}
          </p>
        </div>
      )}
    </>
  );
}
