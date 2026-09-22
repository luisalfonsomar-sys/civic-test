import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { award, checkWhite, mic, xCircle } from "../components/icons";
import { CIVICS_QUESTIONS } from "../data/civicsData";
import { markQuestionCorrected, markQuestionMissed } from "../lib/progress";
import { explanationFor, pickQuizQuestions } from "../lib/quiz";
import { evaluateSpeech, type SpeechEvaluation } from "../lib/speechMatch";
import { useMicLevels } from "../lib/useMicLevels";
import { useSpeechRecognition } from "../lib/useSpeechRecognition";

const INTERVIEW_LENGTH = 20;
const PASS_THRESHOLD = 12;
// Real officers give some slack for a mumbled or misheard answer, but not unlimited retries — an
// uncapped "Try Again" here would let anyone eventually pass every question, which defeats the
// entire point of a screen whose job is to simulate whether you'd pass the real interview.
const MAX_ANSWER_ATTEMPTS = 2;
const BAR_COUNT = 7;
const BAR_MIN_PX = 6;
const BAR_MAX_PX = 34;
const OFFICER_NAMES = ["Officer Martinez", "Officer Chen", "Officer Diaz", "Officer Johnson"];

export function LiveInterviewScreen() {
  const navigate = useNavigate();
  const session = useMemo(() => pickQuizQuestions(CIVICS_QUESTIONS, INTERVIEW_LENGTH), []);
  const officerName = useMemo(
    () => OFFICER_NAMES[Math.floor(Math.random() * OFFICER_NAMES.length)],
    [],
  );

  const [isRandomizing, setIsRandomizing] = useState(true);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<SpeechEvaluation | null>(null);
  const [answerAttempts, setAnswerAttempts] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { supported, status, transcript, start, stop, reset } = useSpeechRecognition();

  const synthSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const hasIntroPlayed = useRef(false);
  // Tracks whichever utterance is the CURRENT one, so a cancelled utterance's onend/onerror —
  // which browsers deliver asynchronously, sometimes after the next utterance has already
  // started — can't flip isSpeaking back to false mid-speech for the new one.
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  function speak(text: string) {
    if (!synthSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    const isCurrent = () => currentUtteranceRef.current === utterance;
    utterance.onstart = () => {
      if (isCurrent()) setIsSpeaking(true);
    };
    utterance.onend = () => {
      if (isCurrent()) setIsSpeaking(false);
    };
    utterance.onerror = () => {
      if (isCurrent()) setIsSpeaking(false);
    };
    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    const timer = setTimeout(() => setIsRandomizing(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  // Stop any in-progress speech the moment this screen goes away, so the officer doesn't keep
  // talking after the interview is exited or finished.
  useEffect(() => {
    return () => {
      if (synthSupported) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const question = session[index];
  const listening = status === "listening";
  const micLevels = useMicLevels(listening, BAR_COUNT);

  // The officer introduces themself once, then reads each question aloud as it comes up —
  // spoken automatically so it actually feels like someone asking, not just displayed text.
  useEffect(() => {
    if (isRandomizing || !question) return;
    if (!hasIntroPlayed.current) {
      hasIntroPlayed.current = true;
      speak(
        `Hi, I'm ${officerName}, a simulated officer for practice. I'll ask you ${session.length} questions today, and I need you to answer each one out loud. Let's get started. ${question.question}`,
      );
      return;
    }
    speak(`Next question. ${question.question}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isRandomizing]);

  useEffect(() => {
    if (status === "idle" && transcript.trim() && !result && question) {
      const evaluation = evaluateSpeech(transcript, question.answers);
      setResult(evaluation);
      setAnswerAttempts((a) => a + 1);
      if (evaluation.verdict === "correct") {
        setCorrectCount((c) => c + 1);
        markQuestionCorrected(question.num);
      } else {
        markQuestionMissed(question.num);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, transcript]);

  function handleMicTap() {
    if (listening) {
      stop();
      return;
    }
    start();
  }

  function handleReplayQuestion() {
    if (!question) return;
    speak(question.question);
  }

  /** Lets a mispronounced or misheard answer be corrected before moving on, up to
   * MAX_ANSWER_ATTEMPTS total tries — resets the recording, not the score: correctCount/the
   * review queue only reflect whichever attempt actually lands, so retrying and then getting it
   * right still counts as right. The retry itself is capped so the pass/fail threshold this
   * screen simulates stays meaningful instead of being clearable by unlimited attempts. */
  function handleTryAgain() {
    reset();
    setResult(null);
  }

  function handleNext() {
    reset();
    setResult(null);
    setAnswerAttempts(0);
    if (index + 1 >= session.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
  }

  if (session.length === 0) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-center font-bold text-ink">Nothing to interview you on yet.</p>
        <button
          className="rounded-2xl bg-ink px-6 py-3 text-white"
          onClick={() => navigate("/mock")}
          type="button"
        >
          Back to Mock Interview
        </button>
      </div>
    );
  }

  const progressPct = ((index + 1) / session.length) * 100;
  const passed = correctCount >= PASS_THRESHOLD;

  return (
    <>
      {isRandomizing && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-cream p-8 text-center">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-ink shadow-lg">
            <div className="animate-dice-roll grid size-11 grid-cols-3 grid-rows-3 gap-1.5">
              <span className="col-start-1 row-start-1 size-2.5 rounded-full bg-white" />
              <span className="col-start-3 row-start-1 size-2.5 rounded-full bg-white" />
              <span className="col-start-2 row-start-2 size-2.5 rounded-full bg-white" />
              <span className="col-start-1 row-start-3 size-2.5 rounded-full bg-white" />
              <span className="col-start-3 row-start-3 size-2.5 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="font-extrabold text-[20px] text-ink">Randomizing questions…</p>
            <p className="text-[14px] text-slate">{officerName} is preparing your interview</p>
          </div>
        </div>
      )}

      <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
        <div className="sticky top-0 z-10 flex w-full shrink-0 items-center gap-4 bg-cream px-6 py-3">
          <button
            aria-label="Exit interview"
            className="flex size-6 shrink-0 items-center justify-center"
            onClick={() => setShowExitConfirm(true)}
            type="button"
          >
            <img alt="" className="size-6" src={xCircle} />
          </button>
          <div className="h-3 flex-1 shrink-0 overflow-hidden rounded-md bg-border">
            <div className="h-full bg-blue transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="whitespace-nowrap font-bold text-[12px] text-slate">
            {index + 1}/{session.length}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-6 p-6">
          <button
            className="flex w-full shrink-0 items-center gap-3 rounded-2xl bg-blue-tint p-4 text-left"
            disabled={!synthSupported}
            onClick={handleReplayQuestion}
            type="button"
          >
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-blue ${
                isSpeaking ? "animate-pulse" : ""
              }`}
            >
              <img alt="" className="size-5" src={award} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="whitespace-nowrap text-[11px] font-bold uppercase text-blue">
                {isSpeaking ? `${officerName} is speaking…` : `${officerName} asks · Simulated`}
              </p>
              <p className="w-full font-bold text-[15px] leading-[1.3] text-ink">
                {question.question}
              </p>
              {synthSupported && (
                <p className="mt-1 whitespace-nowrap text-[11px] font-semibold text-slate">
                  Tap to hear it again
                </p>
              )}
            </div>
          </button>

          {!supported ? (
            <div className="flex w-full shrink-0 flex-col items-start gap-2 rounded-2xl border border-border bg-white p-4">
              <p className="font-bold text-[14px] text-ink">
                Speech recognition isn't available in this browser.
              </p>
              <p className="text-[13px] text-slate">
                Try Chrome on desktop or Android to run the live interview simulation.
              </p>
            </div>
          ) : (
            !result && (
              <div className="flex w-full shrink-0 flex-col items-center gap-4 rounded-[20px] border border-border bg-white p-6">
                <p className="whitespace-nowrap font-semibold text-[13px] text-slate-light">
                  {isSpeaking
                    ? `${officerName} is speaking...`
                    : status === "listening"
                      ? "Listening to your response..."
                      : status === "denied"
                        ? "Microphone access denied"
                        : status === "no-speech"
                          ? "Didn't catch that — try again"
                          : status === "error"
                            ? "Something interrupted that — tap to try again"
                            : "Tap the mic and answer out loud"}
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
            )
          )}

          {result && (
            <div
              className={`flex w-full shrink-0 flex-col items-start gap-3 rounded-2xl border-2 p-4 ${
                result.verdict === "correct"
                  ? "border-green bg-green-tint"
                  : "border-red bg-red-tint"
              }`}
            >
              <p
                className={`whitespace-nowrap font-extrabold text-[16px] ${
                  result.verdict === "correct" ? "text-green" : "text-red"
                }`}
              >
                {result.verdict === "correct" ? "Correct" : "Not accepted"}
              </p>
              <p className="w-full text-[13px] text-ink">
                You said: <span className="font-semibold">"{transcript}"</span>
              </p>
              {result.verdict !== "correct" && (
                <p className="w-full text-[13px] text-ink">
                  Accepted: <span className="font-semibold">"{result.matchedAnswer}"</span>
                </p>
              )}
              {explanationFor(question) && (
                <p className="w-full text-[13px] leading-[1.4] text-slate">
                  {explanationFor(question)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {!result ? (
        supported ? (
          <div className="flex w-full shrink-0 flex-col items-center gap-4 rounded-t-3xl bg-surface p-8">
            <button
              className="flex size-[88px] shrink-0 items-center justify-center rounded-[44px] bg-red-tint disabled:opacity-50"
              disabled={status === "denied" || isSpeaking}
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
              {isSpeaking ? "WAIT FOR THE OFFICER" : listening ? "TAP TO ANSWER" : "TAP TO SPEAK"}
            </p>
          </div>
        ) : (
          // Without speech recognition, this screen has no way to ever set `result`, so without
          // this fallback the footer renders nothing at all — a dead screen stuck on question 1
          // with no way forward except the exit confirmation dialog.
          <div className="flex w-full shrink-0 flex-col items-center gap-3 bg-cream p-6">
            <button
              className="flex w-full shrink-0 items-center justify-center rounded-2xl bg-ink p-4"
              onClick={() => navigate("/mock")}
              type="button"
            >
              <p className="whitespace-nowrap font-bold text-[16px] text-white">
                Return to Mock Interview
              </p>
            </button>
          </div>
        )
      ) : (
        <div className="flex w-full shrink-0 items-center gap-3 bg-cream p-6">
          {result.verdict !== "correct" && answerAttempts < MAX_ANSWER_ATTEMPTS && (
            <button
              className="flex flex-1 shrink-0 items-center justify-center rounded-2xl bg-border p-4"
              onClick={handleTryAgain}
              type="button"
            >
              <p className="whitespace-nowrap font-bold text-[16px] text-ink">Try Again</p>
            </button>
          )}
          <button
            className="flex flex-1 shrink-0 items-center justify-center rounded-2xl bg-ink p-4"
            onClick={handleNext}
            type="button"
          >
            <p className="whitespace-nowrap font-bold text-[16px] text-white">
              {index + 1 >= session.length ? "See Results" : "Next Question"}
            </p>
          </button>
        </div>
      )}

      {showExitConfirm && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-ink/50 p-6"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="flex w-full max-w-[320px] flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-red-tint">
              <img alt="" className="size-7" src={xCircle} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="font-extrabold text-[18px] text-ink">Leave this interview?</p>
              <p className="text-[14px] leading-[1.4] text-slate">
                You're on question {index + 1} of {session.length}. Your interview score won't be
                saved if you leave now.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <button
                className="w-full rounded-2xl bg-red p-3 font-bold text-white"
                onClick={() => navigate("/mock")}
                type="button"
              >
                Exit Interview
              </button>
              <button
                className="w-full rounded-2xl bg-border p-3 font-bold text-ink"
                onClick={() => setShowExitConfirm(false)}
                type="button"
              >
                Keep Going
              </button>
            </div>
          </div>
        </div>
      )}

      {finished && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-cream p-8 text-center">
          <div
            className={`flex size-20 shrink-0 items-center justify-center rounded-full ${
              passed ? "bg-green" : "bg-red"
            }`}
          >
            <img alt="" className="size-10" src={checkWhite} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="font-extrabold text-[26px] text-ink">
              {passed ? "You Passed!" : "Keep Practicing"}
            </p>
            <p className="max-w-[280px] text-[15px] leading-[1.4] text-slate">
              {correctCount} of {session.length} correct — the real interview requires{" "}
              {PASS_THRESHOLD} to pass.
            </p>
          </div>
          <button
            className="w-full max-w-[280px] rounded-2xl bg-ink p-4 font-bold text-white"
            onClick={() => navigate("/")}
            type="button"
          >
            Return Home
          </button>
        </div>
      )}
    </>
  );
}
