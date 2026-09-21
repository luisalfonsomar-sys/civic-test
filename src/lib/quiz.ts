import type { CivicsQuestion } from "../data/civicsData";

export type QuizItem = {
  question: CivicsQuestion;
  choices: string[];
  /** Indexes into `choices` that are accepted answers. Length equals `requiredCount`. */
  correctIndexes: number[];
  /** How many choices the learner must select — parsed from the question's own wording. */
  requiredCount: number;
  /** Parallel to `choices`: why that choice is wrong, or null for a correct one. Grounded in
   * where the choice actually came from (a real fact from another question, or a swapped number
   * in the same template as the real answer) rather than an invented rationale. */
  hints: (string | null)[];
  /** Why the correct answer is actually correct — real civics context (who/what/when/why),
   * not just a restatement of the accepted answer text. Null for the handful of questions with
   * no fixed answer to explain (personalized ones, never actually asked) or no curated entry. */
  explanation: string | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickQuizQuestions(pool: CivicsQuestion[], count: number): CivicsQuestion[] {
  const eligible = pool.filter((q) => !q.personalized);
  return shuffle(eligible).slice(0, Math.min(count, eligible.length));
}

function categoryOf(moduleId: string): string {
  if (moduleId.startsWith("gov-")) return "government";
  if (moduleId.startsWith("history-")) return "history";
  return "symbols";
}

/** Strips parentheticals, punctuation, and leading articles so near-duplicate answers
 * ("(U.S.) Constitution" vs "U.S. Constitution", "The President (of the United States)" vs
 * "President (of the United States)") are recognized as the same fact — several questions in the
 * bank share an answer like this verbatim, and without this a paraphrase of the correct answer
 * could slip in as a "wrong" choice. */
function normalize(answer: string): string {
  return answer
    .replace(/\([^)]*\)/g, " ")
    .replace(/[.,'"“”]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, "");
}

// ---------------------------------------------------------------------------
// Question -> interaction: how many answers does this question actually want?
// ---------------------------------------------------------------------------

const NUMBER_WORD_VALUES: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };

/**
 * Reads the question's own grammar to decide how many separate answers it wants, so "Name two
 * important ideas..." becomes a select-two checkpoint instead of a single-pick one. The leading
 * "the" is the tell for the false positives: "Name the three branches of government" and "What
 * are the two parts of Congress" both ask for one specific, well-known, compound answer (their
 * data only has 1-2 alternate full phrasings of the same trio/pair) — not N interchangeable
 * items pulled from a larger set — so a definite article collapses back to a single selection.
 * Clamped to the number of accepted answers actually on record, so a parse can never demand more
 * selections than the data can supply.
 */
export function parseRequiredSelections(questionText: string, availableAnswers: number): number {
  const m = questionText.match(
    /\b(?:name|what is|what are|describe|identify)\s+(the\s+)?(one|two|three|four|five)\b/i,
  );
  if (!m) return 1;
  if (m[1]) return 1;
  const n = NUMBER_WORD_VALUES[m[2].toLowerCase()];
  return Math.max(1, Math.min(n, availableAnswers));
}

// ---------------------------------------------------------------------------
// Layer 1 — synthesized distractors: content generated FROM the correct
// answer itself (an ordinal swapped for another real amendment, a number
// swapped for another plausible one in the same numeral style), rather than
// borrowed from a different question. These are the highest-confidence
// distractors because they preserve the exact phrasing template of the real
// answer — the only thing that changes is the value being asked about.
// ---------------------------------------------------------------------------

const KNOWN_AMENDMENTS = [1, 2, 4, 5, 10, 13, 14, 15, 19, 22, 25, 26, 27];

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const suffix = suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0];
  return `${n}${suffix}`;
}

/** "(Because of) the 22nd Amendment" -> ["(Because of) the 14th Amendment", ...] */
function amendmentVariants(answer: string): string[] {
  const m = answer.match(/(\d+)(st|nd|rd|th)\s+Amendment/i);
  if (!m) return [];
  const current = Number.parseInt(m[1], 10);
  const options = shuffle(KNOWN_AMENDMENTS.filter((n) => n !== current)).slice(0, 3);
  return options.map((n) => answer.replace(m[0], `${ordinal(n)} Amendment`));
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Spells out a number the same way the civics answers do ("Twenty-seven", "Four hundred
 * thirty-five", "One hundred"). Only used for values under 1000 — every numeral answer in the
 * data set falls well within that range; a value outside it (e.g. a bare year like 1929) simply
 * won't roundtrip below, which is what keeps this from misfiring on a year. */
function numberToWords(n: number): string | null {
  if (n <= 0 || n >= 1000) return null;
  if (n < 20) return ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones ? `${TENS[tens]}-${ONES[ones].toLowerCase()}` : TENS[tens];
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return rest ? `${ONES[hundreds]} hundred ${lowerFirst(numberToWords(rest)!)}` : `${ONES[hundreds]} hundred`;
}

/** A spread of round-ish numbers to offer as nearby wrong values; the actual word for each is
 * generated fresh by `numberToWords`, so there's no lookup table to fall out of sync. */
const CANDIDATE_VALUES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
  27, 28, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 350, 400, 435, 450, 500,
];

/** "Six (6) years" -> ["Two (2) years", "Four (4) years", ...], and "Citizens eighteen (18) and
 * older" -> ["Citizens twenty-five (25) and older", ...] — swaps just the number word directly
 * before the parenthetical numeral, keeping any leading label ("Citizens") intact and lower-cased
 * to fit mid-sentence, and prefers nearby magnitudes so a "how many senators" (100) question
 * doesn't get a wildly implausible "Five hundred (500)".
 *
 * Only fires when the text immediately before the parenthetical actually spells out that same
 * number in words — verified by regenerating the word for the parsed digit and checking it's
 * really there. That guards against two ways this used to break: grabbing just the last word of a
 * multi-word number ("One hundred (100)" -> stray "One " prefix, "hundred" swapped alone into
 * nonsense like "One fifty (50)"), and grabbing a non-numeral word entirely ("The Great Crash
 * (1929)" -> "Crash" isn't a number at all, so it must never be "swapped"). */
function numeralVariants(answer: string): string[] {
  const m = answer.match(/^(.*)\((\d+)\)(.*)$/);
  if (!m) return [];
  const [, beforeParen, digitStr, suffix] = m;
  const current = Number.parseInt(digitStr, 10);
  const currentWord = numberToWords(current);
  if (!currentWord) return [];

  // Trim the whitespace between the number word and "(" before comparing/slicing — otherwise a
  // trailing space makes the endsWith check fail (that was the original bug: "One hundred (100)"
  // never matched because `beforeParen` was "One hundred " with a trailing space).
  const trimmed = beforeParen.replace(/\s+$/, "");
  if (!trimmed.toLowerCase().endsWith(currentWord.toLowerCase())) return [];
  const prefix = trimmed.slice(0, trimmed.length - currentWord.length);

  const nearby = CANDIDATE_VALUES.filter((n) => n !== current).sort(
    (a, b) => Math.abs(a - current) - Math.abs(b - current),
  );
  return shuffle(nearby.slice(0, 6))
    .slice(0, 3)
    .map((n) => {
      const word = numberToWords(n) ?? String(n);
      return `${prefix}${prefix ? lowerFirst(word) : word} (${n})${suffix}`;
    });
}

function synthesizeVariants(answer: string): string[] {
  return [...amendmentVariants(answer), ...numeralVariants(answer)];
}

// ---------------------------------------------------------------------------
// Layer 1b — hand-invented distractors: plausible-format wrong answers that
// are neither pulled from a real question nor a template swap of the correct
// one — genuinely fabricated. Used sparingly and only where fabricating
// content carries no real risk of being mistaken for a genuine fact: an
// invented Cabinet department ("Secretary of Tourism") follows the real
// "Secretary of X" title format closely enough to be a hard foil, while
// being unambiguously fictional — there's no ambiguity to accidentally
// mis-teach, unlike an obscure-but-real fact a learner might reasonably
// doubt. Deliberately NOT used for anything identity-related (no invented
// tribe names — real ethnic groups aren't material to genericize like this)
// or historical-fact-like (no invented documents, events, or people), since
// those carry real risk of being misremembered as true. Keyed by question
// number, like `DISTRACTOR_EXCLUSIONS` — most questions have no entry and
// this layer contributes nothing for them.
// ---------------------------------------------------------------------------

const INVENTED_CABINET_DEPARTMENTS = [
  "Technology",
  "Tourism",
  "Immigration",
  "Trade",
  "Sports and Recreation",
  "Infrastructure",
];

/**
 * Curated, fully hand-written {text, hint} pairs for questions where the pooled real-answer
 * distractors turn out thematically weak — pulled from a totally unrelated question just because
 * nothing closer was available (e.g. "The flag" or "Freedom of speech" as wrong answers to "who
 * can vote" — true facts, just about a different subject entirely, and not even wrong-shaped: the
 * question wants a GROUP OF PEOPLE, not a right or a symbol). Unlike the Cabinet department
 * generator these name REAL groups/things, so each hint is a specific, accurate explanation of
 * why that real group doesn't qualify HERE — not a "this is fictional" disclaimer. That makes
 * these more work to write than the Cabinet case, which is why the list is short and deliberate
 * rather than an attempt to cover every thin spot in the data set.
 */
const CURATED_DISTRACTORS: Record<number, Distractor[]> = {
  8: [
    {
      text: "It established the three branches of government.",
      hint: "That's the U.S. Constitution's role — the Declaration of Independence announced separation from Britain, it didn't set up a government structure.",
    },
    {
      text: "It set the rules for electing a president.",
      hint: "Presidential elections are governed by the Constitution (and the Electoral College) — the Declaration doesn't establish any election procedures.",
    },
    {
      text: "It ended the Revolutionary War.",
      hint: "The Revolutionary War ended with the Treaty of Paris in 1783 — the Declaration, signed in 1776, started the country's break from Britain, it didn't end the fighting.",
    },
  ],
  64: [
    {
      text: "Permanent residents",
      hint: "Permanent residents (green card holders) can live and work in the U.S., but voting in federal elections, running for federal office, and serving on a jury are reserved for citizens.",
    },
    {
      text: "Anyone living in the United States",
      hint: "Just living in the U.S. doesn't grant any of these — they're rights and duties tied to citizenship specifically.",
    },
    {
      text: "People who pay taxes",
      hint: "Paying taxes doesn't grant these rights — plenty of non-citizens pay taxes too; voting, running for federal office, and jury duty are tied to citizenship, not tax status.",
    },
  ],
  108: [
    {
      text: "China",
      hint: "China was a Cold War-era communist power too, but the defining rivalry — the arms race, the space race, the standoff at the center of the Cold War — was with the Soviet Union specifically.",
    },
    {
      text: "Cuba",
      hint: "Cuba allied with the Soviet Union during the Cold War (the Cuban Missile Crisis was part of that standoff), but it wasn't itself the superpower the U.S. was rivaling.",
    },
    {
      text: "Japan",
      hint: "Japan was a U.S. adversary in World War II, a war that ended before the Cold War began — by the Cold War, Japan was a U.S. ally, not its rival.",
    },
  ],
};

function inventedVariants(question: CivicsQuestion): Distractor[] {
  const curated = CURATED_DISTRACTORS[question.num];
  if (curated) return shuffle(curated);
  if (question.num === 48) {
    return shuffle(INVENTED_CABINET_DEPARTMENTS).map((department) => ({
      text: `Secretary of ${department}`,
      hint: `There's no "Secretary of ${department}" in the real U.S. Cabinet — that department doesn't exist.`,
    }));
  }
  return [];
}

// ---------------------------------------------------------------------------
// Layer 2 — real-pool distractors: every accepted answer to every OTHER
// question becomes a candidate, ranked by how well it matches the shape of
// the correct answer.
// ---------------------------------------------------------------------------

type Shape = "year" | "number" | "quoted" | "sentence" | "text";

/** Fast per-string shape check, independent of the curated per-question `kind` — this lets a
 * stray numeric sub-answer (e.g. "1870" inside a question whose primary answer is a sentence)
 * still get matched against other numbers, instead of only ever matching its parent's kind. */
function shapeOf(answer: string): Shape {
  if (/\b(1[6-9]\d{2}|20\d{2})\b/.test(answer)) return "year";
  if (/\d/.test(answer)) return "number";
  if (/["“]/.test(answer)) return "quoted";
  // A full explanatory sentence ("It decides who is elected president.") — the kind of answer
  // "why"/"how" questions give. Distinct from a short noun-phrase answer ("Legislative,
  // executive, and judicial") even when both share the same curated `kind` tag, so one never
  // gets offered as a distractor for the other — mixing them reads as a non sequitur regardless
  // of how topically related the two questions are.
  if (/^(It|This|They|We|You|He|She)\s+\w+s\b/.test(answer) && /[.!?]$/.test(answer)) {
    return "sentence";
  }
  return "text";
}

/** Rewards distractors that also *look* like the correct answer: similar length, similar
 * punctuation (parentheses, quotes), similar word count — so a one-word choice doesn't stick out
 * next to three long sentences. */
function styleScore(a: string, b: string): number {
  let s = 0;
  const lenDiff = Math.abs(a.length - b.length);
  s += Math.max(0, 3 - Math.floor(lenDiff / 10));
  if (/\(/.test(a) === /\(/.test(b)) s += 1;
  if (/["“]/.test(a) === /["“]/.test(b)) s += 1;
  const wordsA = a.split(/\s+/).length;
  const wordsB = b.split(/\s+/).length;
  if (Math.abs(wordsA - wordsB) <= 1) s += 1;
  return s;
}

type Candidate = {
  answer: string;
  normalized: string;
  moduleId: string;
  category: string;
  kind: string;
  shape: Shape;
  /** The question this real answer actually belongs to — carried through so a wrong pick can be
   * explained ("that's the answer to a different question") instead of just marked red. */
  sourceQuestion: CivicsQuestion;
};

/**
 * Some curated kinds are singletons or near-singletons in the data set (there's exactly one
 * "name a tribe" question, one "name two Cabinet positions" question) — a question in one of
 * these kinds can never draw same-kind distractors from elsewhere, and its OWN other accepted
 * answers can't be used either (they'd also be correct). Rather than let those fall through to
 * whatever's left, group them with the nearest neighboring kind that shares the same answer
 * *shape* — a short proper noun naming a specific person or place — so "name a tribe" draws
 * distractors like "Mike Johnson" or "Louisiana Territory" instead of an unrelated war or
 * invention. This is a softer bonus than an exact kind match, not a substitute for one.
 */
const KIND_FAMILIES: Record<string, string[]> = {
  tribe: ["person", "place"],
  "position-title": ["institution", "person"],
  innovation: ["war-event"],
};

/** Human-readable description of each curated kind, used to tell a learner what SORT of thing
 * the question wants when their pick was the wrong sort entirely — "isn't an economic system" is
 * a much more useful correction than "belongs to a different question." Not listed here: the
 * "concept" grab-bag, too varied for one label — see `QUESTION_TOPICS` below. This label is only
 * ever applied to a candidate of a DIFFERENT kind than the question (see `hintFor`) — a same-kind
 * candidate (another real person's name for a "who wrote X" question, another real year for a
 * "when" question) would make "isn't a year" a false statement, since it plainly is one, just the
 * wrong one. */
export const KIND_LABELS: Record<string, string> = {
  person: "a person's name",
  year: "a year",
  duration: "a length of time",
  count: "a number",
  amendment: "an amendment",
  document: "a founding document",
  institution: "a part or branch of government",
  "war-event": "a war or historical event",
  place: "a place",
  holiday: "a national holiday",
  "position-title": "a government position",
  "power-action": "a power or responsibility",
  tribe: "an American Indian tribe",
  innovation: "an American innovation",
};

/** Per-question topic labels for the "concept" kind — too varied for one label per kind, but each
 * individual question still has a clear, nameable topic ("an economic system," "who a senator
 * represents"). Only questions that actually appear in a quiz need an entry; personalized
 * questions are never asked. A question with no entry here and no `KIND_LABELS` match just falls
 * back to the plainer "that's a different question's answer" phrasing. */
export const QUESTION_TOPICS: Record<number, string> = {
  1: "a form of government",
  3: "something the Constitution does",
  4: "what “We the People” means",
  5: "how the Constitution is changed",
  6: "what the Bill of Rights protects",
  8: "a reason the Declaration of Independence is important",
  10: "an idea from the Declaration of Independence or the Constitution",
  12: "an economic system",
  13: "a definition of the rule of law",
  15: "a reason there are three branches of government",
  26: "a reason representatives serve shorter terms than senators",
  28: "a reason each state has two senators",
  31: "who a U.S. senator represents",
  32: "who elects U.S. senators",
  35: "a reason some states have more representatives than others",
  56: "a reason justices serve for life",
  60: "the purpose of the 10th Amendment",
  64: "who can vote, run for office, and serve on a jury",
  65: "a right of everyone living in the United States",
  66: "what the Pledge of Allegiance shows loyalty to",
  71: "a reason to pay federal taxes",
  72: "a reason to register for the Selective Service",
  73: "a reason colonists came to America",
  74: "who lived in America before the Europeans arrived",
  75: "the group of people taken and sold as slaves",
  77: "a reason Americans declared independence from Britain",
  84: "a reason the Federalist Papers were important",
  85: "something Benjamin Franklin is known for",
  86: "something George Washington is known for",
  87: "something Thomas Jefferson is known for",
  88: "something James Madison is known for",
  89: "something Alexander Hamilton is known for",
  94: "something Abraham Lincoln is known for",
  101: "a reason the U.S. entered World War I",
  103: "a description of the Great Depression",
  108: "the United States’ main Cold War rival",
  109: "a U.S. concern during the Cold War",
  110: "a reason the U.S. entered the Korean War",
  111: "a reason the U.S. entered the Vietnam War",
  114: "a reason the U.S. entered the Persian Gulf War",
  115: "what happened on September 11, 2001",
  121: "a reason the flag has 13 stripes",
  122: "a reason the flag has 50 stars",
  123: "the name of the national anthem",
  124: "what “E Pluribus Unum” means",
  125: "a description of Independence Day",
  127: "a description of Memorial Day",
  128: "a description of Veterans Day",
  30: "the current Speaker of the House of Representatives",
  38: "the current President of the United States",
  39: "the current Vice President of the United States",
  57: "the current Chief Justice of the United States",
  78: "who wrote the Declaration of Independence",
  83: "one of the writers of the Federalist Papers",
  99: "a leader of the 1800s women’s rights movement",
  105: "who was president during the Great Depression and World War II",
};

/**
 * What this question is actually looking for, in plain words — used to give a wrong pick's hint
 * concrete context ("this question is asking about an economic system") instead of only pointing
 * at where the pick really came from.
 *
 * Deliberately never used to assert the pick is categorically WRONG (no "X isn't Y" phrasing
 * anywhere in this file) — two different ways that turned out to be false, not just imprecise:
 *   1. Same-kind candidates plainly ARE that kind: "(John) Jay" is a real person's name, just the
 *      wrong one, so "isn't a person's name" is false on its face.
 *   2. Subtler: for open-ended "name one" / "why" questions, a sibling question's answer can be a
 *      true fact about the SAME subject that USCIS simply credits under a different question
 *      number — "Checks and balances" really is something the Constitution does, it's just not
 *      one of the four phrasings USCIS lists for "Name one thing the U.S. Constitution does";
 *      it's the accepted answer for "There are three branches of government. Why?" instead. That
 *      makes "isn't something the Constitution does" an overclaim even though the pick is
 *      genuinely the wrong answer FOR THIS QUESTION. Stating the topic and attributing the pick to
 *      its real question sidesteps both failure modes: it's informative without ever asserting a
 *      fact this data set can't actually back up.
 */
function topicOf(question: CivicsQuestion): string | null {
  return QUESTION_TOPICS[question.num] ?? KIND_LABELS[question.kind] ?? null;
}

/**
 * Ranks a real-pool distractor candidate against the question it's competing for. `kind`
 * (curated in the data set — person / year / duration / document / institution / ...) is the
 * dominant signal: a wrong answer should look like the kind of thing being asked for, e.g. a
 * term-length question gets other term lengths, not a war name. Per-string `shape` is a second,
 * independent signal that catches numeric/year/quoted sub-answers whose parent question doesn't
 * share the same curated kind. Module/category and textual style are tie-breakers.
 */
function score(candidate: Candidate, question: CivicsQuestion, referenceAnswer: string): number {
  let s = 0;
  if (candidate.kind === question.kind) s += 6;
  else if (KIND_FAMILIES[question.kind]?.includes(candidate.kind)) s += 3;
  if (candidate.shape === shapeOf(referenceAnswer)) s += 4;
  if (candidate.moduleId === question.moduleId) s += 2;
  else if (candidate.category === categoryOf(question.moduleId)) s += 1;
  s += styleScore(candidate.answer, referenceAnswer) * 0.5;
  return s;
}

/**
 * A handful of questions are self-referentially about a specific document/answer, which makes
 * that thing logically impossible to also offer as a wrong choice — e.g. Q14 asks for a document
 * that *influenced* the Constitution, so the Constitution itself can't be a candidate (it can't
 * have influenced itself). This can't be caught by kind/shape scoring since the Constitution is a
 * perfectly good "document"-kind, high-scoring candidate by every normal measure; it's wrong for
 * a reason specific to this one question's premise.
 */
const DISTRACTOR_EXCLUSIONS: Record<number, string[]> = {
  14: ["constitution"],
};

export type Distractor = { text: string; hint: string };

/** Builds `count` wrong choices for `question`, given the (one or more) answers already spoken
 * for as correct, drawing on three layers in order: synthesized template variants (a swapped
 * number or amendment), hand-invented plausible fabrications (currently just Cabinet
 * departments), then the ranked real-answer pool for whatever's still needed. Each distractor
 * carries a `hint` explaining specifically why it's wrong, grounded in where it actually came
 * from (or, for an invented one, that it's simply not real). */
function generateDistractors(
  question: CivicsQuestion,
  allQuestions: CivicsQuestion[],
  correctAnswers: string[],
  count: number,
): Distractor[] {
  if (count <= 0) return [];
  const referenceAnswer = correctAnswers[0];
  // Seed with the question's FULL accepted-answer list, not just the slice being shown as
  // correct this time. Two different USCIS questions often legitimately share an answer (e.g.
  // both "What is one way Americans can serve their country?" and "What are two examples of
  // civic participation?" accept "Run for office"), so a candidate pulled from a sibling
  // question can otherwise collide with one of THIS question's own other valid answers — one
  // that just isn't the particular one being tested as "correct" right now. Marking that as a
  // wrong choice would be a real content bug, not just an imprecise distractor.
  const seen = new Set(question.answers.map(normalize));
  const distractors: Distractor[] = [];

  for (const variant of shuffle(synthesizeVariants(referenceAnswer))) {
    if (distractors.length >= count) break;
    const normalized = normalize(variant);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    distractors.push({
      text: variant,
      hint: `Close, but that's not the right value here — the accepted answer is "${referenceAnswer}".`,
    });
  }

  for (const invented of shuffle(inventedVariants(question))) {
    if (distractors.length >= count) break;
    const normalized = normalize(invented.text);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    distractors.push(invented);
  }

  if (distractors.length < count) {
    const exclusions = DISTRACTOR_EXCLUSIONS[question.num];
    const topic = topicOf(question);
    const referenceIsSentence = shapeOf(referenceAnswer) === "sentence";
    const candidates: Candidate[] = [];
    for (const q of allQuestions) {
      if (q.num === question.num || q.personalized) continue;
      for (const answer of q.answers) {
        const normalized = normalize(answer);
        if (!answer || seen.has(normalized)) continue;
        if (exclusions?.includes(normalized)) continue;
        // Never mix a full explanatory sentence in among short noun-phrase choices (or vice
        // versa) — it reads as a non sequitur even when the source question is topically related.
        if ((shapeOf(answer) === "sentence") !== referenceIsSentence) continue;
        seen.add(normalized);
        candidates.push({
          answer,
          normalized,
          moduleId: q.moduleId,
          category: categoryOf(q.moduleId),
          kind: q.kind,
          shape: shapeOf(answer),
          sourceQuestion: q,
        });
      }
    }
    const ranked = shuffle(candidates).sort(
      (a, b) => score(b, question, referenceAnswer) - score(a, question, referenceAnswer),
    );
    for (const c of ranked) {
      if (distractors.length >= count) break;
      const hint = topic
        ? `This question is asking about ${topic} — "${c.answer}" is the accepted answer for a different one: "${c.sourceQuestion.question}".`
        : `That's actually the accepted answer to a different question — "${c.sourceQuestion.question}" — not this one.`;
      distractors.push({ text: c.answer, hint });
    }
  }

  return distractors;
}

/**
 * Real civics context for why the accepted answer is actually correct — who someone was, what a
 * document did, why a rule exists — not just a restatement of the answer text the UI already
 * shows elsewhere. Keyed by question number; covers every question that's ever actually asked
 * (personalized questions are excluded from quizzes entirely, so they have no entry here either).
 * For the four "current officeholder" questions (Speaker, President, Vice President, Chief
 * Justice) the explanation describes the ROLE rather than dated facts about the specific person,
 * since that stays accurate regardless of who holds the office when it's read.
 */
const CORRECT_EXPLANATIONS: Record<number, string> = {
  1: "The U.S. is a republic: citizens hold the power, but they exercise it through elected representatives rather than voting directly on every law.",
  2: "The Constitution is the supreme law of the land — no other law, state or federal, can lawfully conflict with it.",
  3: "The Constitution's core job is to establish the federal government itself: its branches, their powers, and how they interact.",
  4: "“We the People” opens the Constitution by grounding the government's authority in the consent of the people, not a king or ruling class — the essence of self-government.",
  5: "The Constitution can only be changed through the formal amendment process laid out in Article V, which requires broad supermajority support.",
  6: "The Bill of Rights — the Constitution's first ten amendments — guarantees fundamental individual freedoms like speech, religion, and due process.",
  7: "The Constitution has been amended 27 times since 1789, most recently in 1992.",
  8: "The Declaration of Independence formally announced the American colonies' break from British rule in 1776.",
  9: "Adopted July 4, 1776, the Declaration of Independence formally declared the American colonies independent from Britain.",
  10: "Equality and liberty are among the central ideas both documents build on: that all people are created equal and entitled to fundamental freedoms.",
  11: "That phrase appears in the Declaration of Independence's opening section, listing the “unalienable rights” all people are entitled to.",
  12: "The U.S. runs on a free-market (capitalist) economy, where prices, production, and trade are driven mainly by private individuals and companies rather than the government.",
  13: "The rule of law means no one — including government officials — is above the law; everyone is equally bound by it.",
  14: "Documents like the Declaration of Independence and the Magna Carta shaped the ideas the Constitution's framers built on.",
  15: "Splitting government into three branches, each able to check the others, keeps any single branch from becoming too powerful — the system of checks and balances.",
  16: "Congress (legislative) makes laws, the President (executive) enforces them, and the courts (judicial) interpret them.",
  17: "As head of the executive branch, the president is responsible for enforcing the laws Congress passes.",
  18: "Congress — the House and Senate together — holds the legislative power to write and pass federal laws.",
  19: "Congress is split into two chambers: the Senate (100 members, two per state) and the House of Representatives (435 members, apportioned by population).",
  20: "Congress's core constitutional power is legislative: proposing, debating, and passing federal laws.",
  21: "Each of the 50 states elects exactly two senators, for a total of 100.",
  22: "Senators serve six-year terms — longer than representatives, intentionally insulating the Senate somewhat from short-term political swings.",
  24: "House seats are apportioned by state population and have been capped at 435 total by federal law since 1929.",
  25: "The House's two-year terms were designed to keep representatives closely accountable to public opinion.",
  26: "Frequent House elections force representatives to stay responsive to constituents' current views, unlike senators' longer terms.",
  27: "Every state gets exactly two senators regardless of population — a deliberate compromise giving small states equal footing in the Senate.",
  28: "The Great Compromise of 1787 balanced representation by population (the House) with equal representation by state (the Senate).",
  30: "The Speaker of the House is elected by its members to lead the chamber, and stands second in the presidential line of succession after the Vice President.",
  31: "Each senator represents their entire state, not just a district within it.",
  32: "Senators are elected statewide, by all voters in their state.",
  33: "Representatives are elected from — and represent — a specific congressional district within their state.",
  34: "Voters within each congressional district elect that district's representative.",
  35: "House seats are allocated by population, so more populous states get more representatives.",
  36: "Presidential terms last four years, with a maximum of two elected terms under the 22nd Amendment.",
  37: "Ratified in 1951 after FDR's four terms, the 22nd Amendment limits presidents to two elected terms.",
  38: "The President serves as head of state, head of government, and Commander in Chief, elected every four years.",
  39: "The Vice President stands first in the presidential line of succession and casts tie-breaking votes in the Senate.",
  40: "The Constitution's line of succession puts the Vice President first in line if the president can no longer serve.",
  41: "One of the president's core constitutional powers is signing — or vetoing — bills passed by Congress.",
  42: "As Commander in Chief, the president holds civilian control over the U.S. armed forces.",
  43: "A bill becomes law once the president signs it, or after Congress overrides a presidential veto.",
  44: "A veto is the president's constitutional power to reject a bill Congress has passed.",
  45: "The president nominates federal judges, who are then confirmed by the Senate.",
  46: "The executive branch includes the President, the Cabinet, and the federal departments and agencies that carry out federal law.",
  47: "The Cabinet is made up of top officials — like department secretaries — who advise the president on their areas of expertise.",
  48: "Cabinet positions are the heads of major federal departments — like the Attorney General (Justice) or the Secretary of Agriculture — who report directly to the president.",
  49: "The Electoral College, not the national popular vote, formally elects the president — a compromise between direct popular election and selection by Congress.",
  50: "The Supreme Court sits at the top of the judicial branch, alongside the lower federal courts.",
  51: "The judicial branch interprets laws and can strike down those that violate the Constitution — the power of judicial review.",
  52: "The Supreme Court is the final court of appeal in the United States — its rulings can't be appealed any further.",
  53: "The Supreme Court has had nine seats — one Chief Justice and eight Associate Justices — since 1869.",
  54: "With nine justices on the Court, a simple majority — five — is enough to decide most cases.",
  55: "Justices are appointed for life, removable only through impeachment, not by election or term limits.",
  56: "Lifetime tenure insulates justices from political pressure and electoral consequences when they rule on cases.",
  57: "The Chief Justice leads the Supreme Court and, like other justices, is nominated by the president and confirmed by the Senate.",
  58: "Only the federal government can coin money, declare war, and conduct foreign policy — powers the Constitution reserves exclusively to it.",
  59: "Powers the Constitution doesn't give the federal government — like education, policing, and driver's licensing — are left to the states under the 10th Amendment.",
  60: "The 10th Amendment establishes federalism: any power the Constitution doesn't grant the federal government stays with the states or the people.",
  63: "The 26th Amendment (1971) lowered the voting age to 18, joining the 15th, 19th, and 24th Amendments in protecting voting rights by race, sex, and against poll taxes.",
  64: "Voting in federal elections, holding federal office, and serving on a jury are rights and duties the Constitution reserves specifically for U.S. citizens.",
  65: "The First Amendment guarantees freedoms of speech, religion, assembly, and petition to everyone living in the U.S. — not just citizens.",
  66: "The Pledge of Allegiance is a promise of loyalty to the nation and the republic it represents.",
  67: "The Oath of Allegiance requires new citizens to renounce prior allegiances and pledge to support and defend the Constitution.",
  68: "The 14th Amendment's citizenship clause grants citizenship to anyone born on U.S. soil; citizenship can also come through naturalization.",
  69: "Civic participation covers any active way of engaging with government — voting, running for office, joining a campaign, or contacting officials.",
  70: "Voting is one of the most direct ways citizens can shape their government.",
  71: "Federal income tax is mandated by law, under the 16th Amendment, and funds the federal government's operations.",
  72: "Selective Service registration is legally required for most male citizens and residents aged 18 through 25.",
  73: "Colonists came to America for many reasons, including religious freedom, economic opportunity, and escape from persecution.",
  74: "American Indian nations had lived across the continent for thousands of years before European colonization began.",
  75: "Millions of Africans were forcibly taken and sold into slavery, primarily to work on Southern plantations.",
  76: "The American Revolutionary War (1775–1783) was fought to win independence from British rule.",
  77: "Taxes imposed without colonial representation in Parliament — like the Stamp Act — were a central grievance leading to independence.",
  78: "Thomas Jefferson drafted the Declaration of Independence in 1776, later becoming the third president.",
  79: "The Continental Congress formally adopted the Declaration of Independence on July 4, 1776.",
  80: "The Battle of Bunker Hill (1775) was one of the first major battles of the Revolutionary War.",
  81: "The 13 original states were the former British colonies that declared independence together in 1776.",
  82: "The Constitutional Convention drafted the U.S. Constitution in Philadelphia in 1787.",
  83: "Madison, Hamilton, and Jay — writing together as “Publius” — authored the Federalist Papers to build public support for ratifying the Constitution.",
  84: "The Federalist Papers explained and defended the Constitution's structure to a public deciding whether to ratify it.",
  85: "Benjamin Franklin was a prolific inventor, diplomat, and civic founder — including founding the first lending library in America.",
  86: "As the first president and commanding general of the Continental Army, Washington earned the title “Father of His Country.”",
  87: "Jefferson is best known for drafting the Declaration of Independence, though he also served as the third president.",
  88: "Madison is credited as the Constitution's chief architect and later became the fourth president.",
  89: "Hamilton was the first Treasury Secretary and a key architect of the young nation's financial system.",
  90: "The Louisiana Purchase (1803) roughly doubled the size of the United States for about $15 million.",
  91: "The U.S. fought several wars in the 1800s, including the War of 1812, the Mexican-American War, and the Civil War.",
  92: "The Civil War (1861–1865) was fought between the Union (North) and the Confederacy (South), largely over slavery.",
  93: "The Civil War began with the Confederate attack on Fort Sumter in April 1861.",
  94: "Lincoln led the Union through the Civil War and issued the Emancipation Proclamation, declaring enslaved people in Confederate states free.",
  95: "The Emancipation Proclamation (1863) declared enslaved people in Confederate-held territory legally free.",
  96: "Slavery was formally ended by the 13th Amendment, ratified after the Union's Civil War victory.",
  97: "The 14th Amendment (1868) guarantees citizenship to all persons born or naturalized in the United States.",
  98: "The 15th Amendment (1870), passed during Reconstruction after the Civil War, barred denying the vote based on race.",
  99: "Susan B. Anthony was a leading figure in the 19th-century women's suffrage movement, decades before the 19th Amendment passed.",
  100: "The U.S. fought several major wars in the 1900s: World War I, World War II, Korea, and Vietnam.",
  101: "Germany's unrestricted submarine warfare against U.S. ships helped draw America into World War I in 1917.",
  102: "The 19th Amendment, ratified in 1920, guaranteed women the right to vote nationwide.",
  103: "The Great Depression (1929 into the late 1930s) was the deepest and longest-lasting economic downturn in modern U.S. history.",
  104: "The stock market crash of October 1929 triggered the start of the Great Depression.",
  105: "FDR led the country through both the Great Depression and most of World War II, serving an unprecedented four terms.",
  106: "Japan's surprise attack on Pearl Harbor in December 1941 brought the United States into World War II.",
  107: "Eisenhower commanded Allied forces in WWII before becoming the 34th president.",
  108: "The Cold War (roughly 1947–1991) was a decades-long geopolitical standoff between the U.S. and the Soviet Union.",
  109: "Containing the spread of communism was the central U.S. strategic concern throughout the Cold War.",
  110: "The U.S. entered the Korean War (1950–1953) to stop Communist North Korea from overtaking the South.",
  111: "U.S. involvement in Vietnam was driven by the same Cold War goal: stopping the spread of communism in Southeast Asia.",
  112: "The civil rights movement of the 1950s and '60s fought to end legal racial segregation and discrimination.",
  113: "Martin Luther King Jr. led the civil rights movement's push for racial equality through nonviolent protest.",
  114: "The 1991 Gulf War was fought to reverse Iraq's invasion and occupation of Kuwait.",
  115: "On September 11, 2001, terrorists hijacked and crashed four planes, killing nearly 3,000 people.",
  116: "The wars in Afghanistan and Iraq followed the September 11 attacks as part of the broader War on Terror.",
  117: "Hundreds of American Indian tribes and nations are recognized across the United States, including the Apache, Cherokee, Navajo, and Sioux.",
  118: "American inventors are credited with landmark innovations like the light bulb, the airplane, and the assembly line.",
  119: "Washington, D.C. was purpose-built as the nation's capital, chosen as a compromise location between northern and southern states.",
  120: "The Statue of Liberty stands on Liberty Island in New York Harbor, a gift from France dedicated in 1886.",
  121: "The flag's 13 stripes represent the 13 original colonies that became the first states.",
  122: "The flag's 50 stars represent the 50 states, with a new star traditionally added when a state joins the Union.",
  123: "Written by Francis Scott Key during the War of 1812, it officially became the national anthem in 1931.",
  124: "“E Pluribus Unum” reflects the idea of a single nation formed out of many states — or many peoples.",
  125: "Independence Day (July 4) marks the adoption of the Declaration of Independence in 1776.",
  126: "Congress has designated eleven federal holidays, honoring everything from the new year to the nation's independence to those who've served.",
  127: "Memorial Day honors U.S. military members who died while serving.",
  128: "Veterans Day honors everyone who has served in the U.S. military, living or dead.",
};

/**
 * Builds a full quiz item for `question`: figures out how many answers it wants
 * (`parseRequiredSelections`), reserves that many real accepted answers as correct, and fills the
 * rest of the choice list with generated distractors, each carrying a grounded explanation of why
 * it's wrong. A "Name two" question comes back with 2 correct indexes and enough extra wrong
 * choices that picking the right pair actually takes knowing the material.
 */
export function buildQuizItem(question: CivicsQuestion, allQuestions: CivicsQuestion[]): QuizItem {
  const requiredCount = parseRequiredSelections(question.question, question.answers.length);
  const correctAnswers = question.answers.slice(0, requiredCount);
  const totalChoices = requiredCount <= 1 ? 4 : Math.min(8, requiredCount + 3);
  const distractors = generateDistractors(
    question,
    allQuestions,
    correctAnswers,
    totalChoices - requiredCount,
  );

  type Entry = { text: string; hint: string | null };
  const entries: Entry[] = shuffle([
    ...correctAnswers.map((text): Entry => ({ text, hint: null })),
    ...distractors.map((d): Entry => ({ text: d.text, hint: d.hint })),
  ]);

  const correctSet = new Set(correctAnswers.map(normalize));
  const choices = entries.map((e) => e.text);
  const hints = entries.map((e) => e.hint);
  const correctIndexes = choices
    .map((choice, i) => (correctSet.has(normalize(choice)) ? i : -1))
    .filter((i) => i !== -1);

  return { question, choices, correctIndexes, requiredCount, hints, explanation: explanationFor(question) };
}

/** Real civics context for why a question's accepted answer is correct — shared by the quiz flow
 * above and by Oral Practice, which shows an accepted response without building a full quiz item. */
export function explanationFor(question: CivicsQuestion): string | null {
  return CORRECT_EXPLANATIONS[question.num] ?? null;
}
