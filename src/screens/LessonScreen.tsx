import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LessonHeader } from "../components/LessonHeader";
import { checkWhite, star } from "../components/icons";
import { CIVICS_QUESTIONS, MODULES } from "../data/civicsData";
import { recordModuleResult } from "../lib/progress";
import { buildQuizItem, pickQuizQuestions } from "../lib/quiz";

const LESSON_LENGTH = 8;
// The real USCIS 2025 civics test asks up to 20 of the 128 questions and requires 12 correct
// (60%) to pass — see the "65/20 Special Consideration" section of the official M-1778 handout
// for the separate, smaller 10-of-20/6-correct track, which is a distinct thing, not this one.
const MOCK_LENGTH = 20;
const MAX_ATTEMPTS = 3;

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const bSet = new Set(b);
  return a.every((n) => bSet.has(n));
}

export function LessonScreen() {
  const navigate = useNavigate();
  const { moduleId = "" } = useParams<{ moduleId: string }>();
  const isMock = moduleId === "mock";
  const module = MODULES.find((m) => m.id === moduleId);

  const session = useMemo(() => {
    const pool = isMock ? CIVICS_QUESTIONS : (module?.questions ?? []);
    const count = isMock ? MOCK_LENGTH : LESSON_LENGTH;
    const questions = pickQuizQuestions(pool, count);
    return questions.map((q) => buildQuizItem(q, CIVICS_QUESTIONS));
  }, [isMock, module]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [lives, setLives] = useState(5);
  const [correctCount, setCorrectCount] = useState(0);
  const [missed, setMissed] = useState<number[]>([]);
  const [corrected, setCorrected] = useState<number[]>([]);
  /** Whether the CURRENT question has ever been answered wrong this attempt — drives the
   * try-again loop and whether it lands in the review queue once finally solved. */
  const [everWrong, setEverWrong] = useState(false);
  /** How many times "Check Answer" has been pressed on the CURRENT question — caps retries at
   * MAX_ATTEMPTS so a stuck question doesn't loop forever. */
  const [attempts, setAttempts] = useState(0);

  if (session.length === 0) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-center font-bold text-ink">Lesson not found.</p>
        <button
          className="rounded-2xl bg-ink px-6 py-3 text-white"
          onClick={() => navigate("/")}
          type="button"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const item = session[index];
  const isMultiSelect = item.requiredCount > 1;
  const isCorrect = checked && sameSet(selected, item.correctIndexes);
  const progressPct = (index / session.length) * 100;

  function finishSession(finalCorrect: number, finalMissed: number[], finalCorrected: number[]) {
    if (!isMock && module) {
      recordModuleResult(module.id, finalCorrect, session.length, finalMissed, finalCorrected);
    }
    navigate("/");
  }

  function toggleChoice(i: number) {
    if (checked) return;
    if (!isMultiSelect) {
      setSelected([i]);
      return;
    }
    setSelected((prev) => {
      if (prev.includes(i)) return prev.filter((n) => n !== i);
      if (prev.length >= item.requiredCount) return prev;
      return [...prev, i];
    });
  }

  function handleCheck() {
    if (selected.length !== item.requiredCount) return;
    setChecked(true);
    if (sameSet(selected, item.correctIndexes)) {
      setCorrectCount((c) => c + 1);
    } else {
      setLives((l) => Math.max(0, l - 1));
      setEverWrong(true);
      setAttempts((a) => a + 1);
    }
  }

  /** Wrong answer, tries left: don't move on — clear the pick and let them reason it through
   * again with the hints still fresh, up to MAX_ATTEMPTS on this exact question. */
  function handleTryAgain() {
    setSelected([]);
    setChecked(false);
  }

  function handleContinue() {
    const nextMissed = everWrong ? [...missed, item.question.num] : missed;
    const nextCorrected = everWrong ? corrected : [...corrected, item.question.num];
    setMissed(nextMissed);
    setCorrected(nextCorrected);

    const isLast = index + 1 >= session.length;

    if (isLast) {
      finishSession(correctCount, nextMissed, nextCorrected);
      return;
    }
    setIndex((i) => i + 1);
    setSelected([]);
    setChecked(false);
    setEverWrong(false);
    setAttempts(0);
  }

  const correctAnswerText = item.correctIndexes.map((i) => item.choices[i]).join("; ");
  const remainder = item.question.answers.slice(item.requiredCount, item.requiredCount + 2);
  const wrongPicks = checked ? selected.filter((i) => !item.correctIndexes.includes(i)) : [];
  const attemptsLeft = MAX_ATTEMPTS - attempts;
  const outOfTries = !isCorrect && checked && attemptsLeft <= 0;

  return (
    <>
      <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
        <LessonHeader lives={lives} progress={progressPct} />
        <div className="flex w-full shrink-0 flex-col items-start gap-7 p-6">
          <div className="flex w-full shrink-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-start rounded-md bg-blue-tint px-2.5 py-1">
              <p className="font-bold text-[11px] uppercase text-blue">
                {isMock ? "Mock Interview" : module?.title}
              </p>
            </div>
            {isMultiSelect && (
              <p className="shrink-0 whitespace-nowrap font-bold text-[12px] text-slate">
                Select {item.requiredCount} ({selected.length}/{item.requiredCount})
              </p>
            )}
          </div>
          <p className="w-full font-extrabold text-[24px] leading-[1.3] text-ink">
            {item.question.question}
          </p>

          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            {item.choices.map((choice, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = selected.includes(i);
              const isCorrectChoice = item.correctIndexes.includes(i);
              const isRight = checked && isCorrectChoice;
              const isWrong = checked && isSelected && !isCorrectChoice;
              const isMissedCorrect = checked && isCorrectChoice && !isSelected;

              return (
                <button
                  className={`flex w-full shrink-0 items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors ${
                    isRight
                      ? isMissedCorrect
                        ? "border-green bg-cream"
                        : "border-green bg-green-tint"
                      : isWrong
                        ? "border-red bg-red-tint"
                        : isSelected
                          ? "border-blue bg-blue-tint drop-shadow-[0px_4px_4px_rgba(58,176,255,0.08)]"
                          : "border-border bg-cream"
                  } ${checked && !isSelected && !isCorrectChoice ? "opacity-60" : ""}`}
                  disabled={checked || (isMultiSelect && !isSelected && selected.length >= item.requiredCount)}
                  key={choice}
                  onClick={() => toggleChoice(i)}
                  type="button"
                >
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-[14px] ${
                      isRight
                        ? "bg-green"
                        : isWrong
                          ? "bg-red"
                          : isSelected
                            ? "bg-blue"
                            : "bg-border"
                    }`}
                  >
                    <p
                      className={`font-bold text-[14px] ${
                        isRight || isWrong || isSelected ? "text-white" : "text-ink"
                      }`}
                    >
                      {letter}
                    </p>
                  </div>
                  <p className="flex-1 font-semibold text-[15px] text-ink">{choice}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!checked ? (
        <div className="flex w-full shrink-0 flex-col items-start bg-cream p-6">
          <button
            className="flex w-full shrink-0 items-center justify-center rounded-2xl bg-ink p-4 disabled:opacity-40"
            disabled={selected.length !== item.requiredCount}
            onClick={handleCheck}
            type="button"
          >
            <p className="whitespace-nowrap font-bold text-[16px] text-white">Check Answer</p>
          </button>
        </div>
      ) : (
        <div
          className={`flex w-full shrink-0 flex-col items-start gap-4 rounded-t-3xl p-6 ${
            isCorrect ? "bg-green-tint" : "bg-red-tint"
          }`}
        >
          <div className="flex w-full shrink-0 items-center gap-3">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-[18px] ${
                isCorrect ? "bg-green" : "bg-red"
              }`}
            >
              <img alt="" className="size-5" src={isCorrect ? star : checkWhite} />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <p
                className={`whitespace-nowrap font-extrabold text-[20px] ${
                  isCorrect ? "text-green" : "text-red"
                }`}
              >
                {isCorrect
                  ? "Awesome! Correct Answer"
                  : outOfTries
                    ? "Out of tries for this one"
                    : "Not quite right — try again"}
              </p>
              {!isCorrect && (
                <p className="whitespace-nowrap font-bold text-[12px] text-red">
                  Attempt {attempts} of {MAX_ATTEMPTS}
                </p>
              )}
            </div>
          </div>

          {!isCorrect && wrongPicks.length > 0 && (
            <div className="flex w-full shrink-0 flex-col items-start gap-2 rounded-2xl border border-red bg-white p-4">
              <p className="whitespace-nowrap font-bold text-[12px] uppercase text-red">
                Why that's not it
              </p>
              {wrongPicks.map((i) => (
                <p className="w-full font-medium text-[13px] leading-[1.4] text-ink" key={i}>
                  <span className="font-bold">"{item.choices[i]}"</span>
                  {" — "}
                  {item.hints[i] ?? "This isn't one of the USCIS-accepted answers for this question."}
                </p>
              ))}
            </div>
          )}

          <div className="flex w-full shrink-0 flex-col items-start gap-2 rounded-2xl border border-border bg-white p-4">
            <p className="whitespace-nowrap font-bold text-[12px] uppercase text-blue">
              {isCorrect ? "Learning Note" : "Why this is right"}
            </p>
            <p className="w-full font-bold text-[14px] leading-[1.4] text-ink">
              {correctAnswerText}
              {remainder.length > 0 ? ` — also accepted: ${remainder.join("; ")}` : ""}
            </p>
            {item.explanation && (
              <p className="w-full font-medium text-[13px] leading-[1.4] text-slate">
                {item.explanation}
              </p>
            )}
          </div>

          <button
            className={`flex w-full shrink-0 items-center justify-center rounded-2xl p-4 ${
              isCorrect ? "bg-green" : "bg-red"
            }`}
            onClick={isCorrect || outOfTries ? handleContinue : handleTryAgain}
            type="button"
          >
            <p className="whitespace-nowrap font-bold text-[16px] text-white">
              {isCorrect || outOfTries
                ? index + 1 >= session.length
                  ? "Finish"
                  : "Continue"
                : `Try Again (${attemptsLeft} left)`}
            </p>
          </button>
        </div>
      )}
    </>
  );
}
