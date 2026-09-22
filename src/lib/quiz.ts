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

/** Deterministic PRNG (mulberry32) — same seed always produces the same sequence. Used to make a
 * given question's distractor set and choice order fixed across every attempt (so a reviewed
 * question stays reviewed), while different questions still get independently varied sets since
 * each is seeded from its own question number. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
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
function amendmentVariants(answer: string, rng: () => number): string[] {
  const m = answer.match(/(\d+)(st|nd|rd|th)\s+Amendment/i);
  if (!m) return [];
  const current = Number.parseInt(m[1], 10);
  const options = seededShuffle(KNOWN_AMENDMENTS.filter((n) => n !== current), rng).slice(0, 3);
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
function numeralVariants(answer: string, rng: () => number): string[] {
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
  return seededShuffle(nearby.slice(0, 6), rng)
    .slice(0, 3)
    .map((n) => {
      const word = numberToWords(n) ?? String(n);
      // The suffix is copied verbatim from the real answer, which is only ever grammatical for
      // the real answer's own count — "Two (2) years" swapped to n=1 would otherwise read "One
      // (1) years". Re-pluralize a leading " year(s)" unit word to match the swapped-in count.
      const fixedSuffix =
        n === 1 ? suffix.replace(/^ years\b/, " year") : suffix.replace(/^ year\b/, " years");
      return `${prefix}${prefix ? lowerFirst(word) : word} (${n})${fixedSuffix}`;
    });
}

function synthesizeVariants(answer: string, rng: () => number): string[] {
  return [...amendmentVariants(answer, rng), ...numeralVariants(answer, rng)];
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
// Hand-authored distractors for every question that has them (124 of 128 — the 4 personalized
// questions have no fixed answer to build wrong choices against). Each wrong choice is written
// specifically for that question, rather than mined from other questions' real answers, so a
// distractor never accidentally overlaps with something the same question (or a sibling
// question) also accepts. The layer-2 real-answer-pool generator below still exists as a
// fallback for any question that ever loses its entry here.
const CURATED_DISTRACTORS: Record<number, Distractor[]> = {
  1: [
    { text: "Direct democracy", hint: "In a direct democracy, citizens vote on every law themselves — the U.S. instead elects representatives to make laws on the people's behalf, which is a republic." },
    { text: "Monarchy", hint: "Under a monarchy, power passes by inheritance to a king or queen — the U.S. rejected inherited rule when it declared independence from Britain." },
    { text: "Oligarchy", hint: "An oligarchy concentrates power in a small, unelected group — the U.S. system spreads power through elected representatives accountable to voters." },
  ],
  2: [
    { text: "Declaration of Independence", hint: "The Declaration announces separation from Britain and states founding ideals, but it doesn't function as enforceable law — the Constitution is what actually establishes and governs the legal system." },
    { text: "Articles of Confederation", hint: "The nation's first governing document, but it was replaced by the Constitution in 1789 because it proved too weak — it's no longer in effect." },
    { text: "The Great Book of Laws", hint: "Not a real founding document — it doesn't exist." },
  ],
  3: [
    { text: "Declares war on foreign nations", hint: "Declaring war is a power Congress exercises under the Constitution's authority — it's not something the Constitution itself does as a document." },
    { text: "Collects federal taxes", hint: "Tax collection is a government function carried out under the Constitution's authority, not an action the document performs itself." },
    { text: "Elects the president", hint: "Elections happen under rules the Constitution sets up, but the Constitution doesn't elect anyone — voters and the Electoral College do." },
  ],
  4: [
    { text: "Equal justice under law", hint: "A broader constitutional principle, but not what this specific opening phrase is describing." },
    { text: "Freedom of religion", hint: "A specific First Amendment right, not the idea behind the Constitution's opening phrase." },
    { text: "Checks and balances", hint: "Describes how power is divided among the branches, not the idea that government's authority comes from the people." },
  ],
  5: [
    { text: "A presidential executive order", hint: "An executive order directs how existing law is carried out — it can't add, remove, or rewrite anything in the Constitution itself." },
    { text: "A Supreme Court ruling", hint: "The Court can interpret what the Constitution means, but a ruling doesn't change its actual text — only the formal amendment process can do that." },
    { text: "A simple majority vote in Congress", hint: "A simple majority passes ordinary legislation — amending the Constitution requires a much higher bar: two-thirds of both chambers, then ratification by three-fourths of the states." },
  ],
  6: [
    { text: "The boundaries between states", hint: "State boundaries aren't something the Bill of Rights addresses — it protects individual rights and freedoms." },
    { text: "The powers of the federal government", hint: "That's what the Constitution as a whole defines — the Bill of Rights specifically protects individual rights, not government powers." },
    { text: "The right to a fair trial only", hint: "The Bill of Rights protects a broad set of rights and freedoms — speech, religion, assembly, and more — not just the right to a fair trial." },
  ],
  7: [
    { text: "Twenty-eight (28)", hint: "Close, but that's not the right value here — the accepted answer is \"Twenty-seven (27)\"." },
    { text: "Thirty (30)", hint: "Close, but that's not the right value here — the accepted answer is \"Twenty-seven (27)\"." },
    { text: "Twenty-five (25)", hint: "Close, but that's not the right value here — the accepted answer is \"Twenty-seven (27)\"." },
  ],
  8: [
    { text: "It ended the Revolutionary War.", hint: "The Revolutionary War ended with the Treaty of Paris in 1783 — the Declaration, signed in 1776, started the country's break from Britain, it didn't end the fighting." },
    { text: "It established the three branches of government.", hint: "That's the U.S. Constitution's role — the Declaration of Independence announced separation from Britain, it didn't set up a government structure." },
    { text: "It set the rules for electing a president.", hint: "Presidential elections are governed by the Constitution (and the Electoral College) — the Declaration doesn't establish any election procedures." },
  ],
  9: [
    { text: "(U.S.) Constitution", hint: "Written in 1787, eleven years after independence was declared — it organizes the government; the document that announced the break from Britain is the Declaration of Independence." },
    { text: "Articles of Confederation", hint: "The nation's first governing framework, adopted in 1781 — it came after independence had already been declared, not the document that declared it." },
    { text: "The Mayflower Compact", hint: "A 1620 agreement among Pilgrims to govern themselves in the new colony — over 150 years before independence was declared, and unrelated to it." },
  ],
  10: [
    { text: "We are a republic", hint: "A description of the form of government the Constitution sets up, not one of the founding ideas (\"equality\" and \"liberty\") the documents are known for." },
    { text: "We are a capitalist country", hint: "Describes the U.S. economic system, not a founding political idea from these two documents." },
    { text: "The amendments and system of checks and balances", hint: "Mechanisms built into the Constitution's structure, not among the founding ideals these two documents are known for." },
  ],
  11: [
    { text: "Virginia Declaration of Rights", hint: "A 1776 state document that influenced Jefferson's writing, but the phrase itself appears in the Declaration of Independence, not this earlier state text." },
    { text: "(U.S.) Constitution", hint: "Establishes the structure of government but doesn't contain this phrase — it appears in the Declaration's opening section instead." },
    { text: "Mayflower Compact", hint: "A brief 1620 self-governance agreement among Pilgrims — it doesn't contain this phrase, which comes from the Declaration written over 150 years later." },
  ],
  12: [
    { text: "Mercantilism", hint: "Mercantilism is a colonial-era system where the state tightly controls trade to accumulate wealth for the nation itself — the U.S. economy runs on private enterprise and free markets instead, which is capitalism." },
    { text: "Command economy", hint: "In a command economy, a central government decides what's produced, how much, and at what price — the U.S. leaves those decisions to private individuals and companies responding to supply and demand." },
    { text: "Barter economy", hint: "A barter economy has no standard currency — goods and services are traded directly for other goods and services. The U.S. uses money-based markets, not barter." },
  ],
  13: [
    { text: "Only elected officials must follow the law", hint: "The rule of law applies to everyone equally, not just those in government — no one, elected or not, is above it." },
    { text: "Laws only apply to the states, not the federal government", hint: "The rule of law binds every level of government and every individual, not just states." },
    { text: "The president can change laws by decree", hint: "That would put the president above the law — exactly what the rule of law prevents." },
  ],
  14: [
    { text: "U.S. Constitution", hint: "The Constitution is what was influenced — this question asks about a document that shaped IT, like the Declaration of Independence or the Mayflower Compact." },
    { text: "Emancipation Proclamation", hint: "That came in 1863, nearly 80 years after the Constitution was written — it didn't influence it." },
    { text: "Bill of Rights", hint: "The Bill of Rights is the Constitution's first ten amendments, added after ratification — not a document that influenced the original Constitution." },
  ],
  15: [
    { text: "So laws can be passed more quickly", hint: "Splitting power across three branches actually slows the process down, forcing proposals through multiple checks — not meant to speed up lawmaking." },
    { text: "So each branch can operate independently of the Constitution", hint: "All three branches are created by and bound by the Constitution — none of them operates independently of it; the separation is about balancing power within that framework, not escaping it." },
    { text: "So states are represented equally in government", hint: "Equal state representation is what the Senate does (two senators per state), not the reason for having three separate branches of government." },
  ],
  16: [
    { text: "Federal, state, and local", hint: "These are levels of government, not branches — the three branches (legislative, executive, judicial) all exist within a single level, the federal government." },
    { text: "Senate, House, and Supreme Court", hint: "The Senate and House are the two parts of the legislative branch, and the Supreme Court is one part of the judicial branch — this list names pieces of two branches, not the three branches themselves." },
    { text: "President, Congress, and Cabinet", hint: "The Cabinet is part of the executive branch, not a branch of its own — so this list only spans two branches (executive and legislative) instead of three." },
  ],
  17: [
    { text: "Judicial branch", hint: "Led by the Supreme Court and federal judges — the president has no authority over the courts." },
    { text: "Legislative branch", hint: "That's Congress's domain, which writes laws — the president enforces laws but doesn't lead the branch that writes them." },
    { text: "All three branches", hint: "The president leads only the executive branch — the Constitution deliberately keeps the three branches separate and independent of one another." },
  ],
  18: [
    { text: "The President", hint: "The president can sign or veto laws, but doesn't write them — that's Congress's job." },
    { text: "The Supreme Court", hint: "The Court interprets and reviews laws for constitutionality — it doesn't write new legislation." },
    { text: "State legislatures", hint: "State legislatures write state laws, not federal laws — that's Congress's role at the federal level." },
  ],
  19: [
    { text: "Executive and legislative", hint: "Those are two of the three branches of government, not the two chambers within Congress." },
    { text: "Federal and state", hint: "Those are levels of government, not the two chambers that make up Congress." },
    { text: "Majority and minority parties", hint: "Those describe political control within Congress, not its two structural chambers." },
  ],
  20: [
    { text: "Enforces laws", hint: "That's the executive branch's job, carried out by the president and federal agencies — not Congress." },
    { text: "Interprets laws", hint: "That's the judicial branch's role, exercised by the courts — not Congress." },
    { text: "Appoints federal judges", hint: "The president nominates judges and the Senate confirms them — but writing and passing laws is Congress's core power, not judicial appointments." },
  ],
  21: [
    { text: "Ninety (90)", hint: "Close, but that's not the right value here — the accepted answer is \"One hundred (100)\"." },
    { text: "Sixty (60)", hint: "Close, but that's not the right value here — the accepted answer is \"One hundred (100)\"." },
    { text: "Fifty (50)", hint: "Close, but that's not the right value here — the accepted answer is \"One hundred (100)\"." },
  ],
  22: [
    { text: "Four (4) years", hint: "Close, but that's not the right value here — the accepted answer is \"Six (6) years\"." },
    { text: "Nine (9) years", hint: "Close, but that's not the right value here — the accepted answer is \"Six (6) years\"." },
    { text: "Three (3) years", hint: "Close, but that's not the right value here — the accepted answer is \"Six (6) years\"." },
  ],
  24: [
    { text: "Five hundred (500)", hint: "Close, but that's not the right value here — the accepted answer is \"Four hundred thirty-five (435)\"." },
    { text: "Four hundred fifty (450)", hint: "Close, but that's not the right value here — the accepted answer is \"Four hundred thirty-five (435)\"." },
    { text: "Three hundred fifty (350)", hint: "Close, but that's not the right value here — the accepted answer is \"Four hundred thirty-five (435)\"." },
  ],
  25: [
    { text: "Seven (7) years", hint: "Close, but that's not the right value here — the accepted answer is \"Two (2) years\"." },
    { text: "Three (3) years", hint: "Close, but that's not the right value here — the accepted answer is \"Two (2) years\"." },
    { text: "One (1) year", hint: "Close, but that's not the right value here — the accepted answer is \"Two (2) years\"." },
  ],
  26: [
    { text: "Because the Constitution originally didn't give representatives voting power", hint: "False premise — representatives have always had full voting power in the House." },
    { text: "To limit representatives to one term only", hint: "There's no term limit on House members; they can be re-elected indefinitely — they just face voters more often." },
    { text: "Because it costs less to hold House elections", hint: "The constitutional reason for shorter terms is frequent accountability to voters, not cost." },
  ],
  27: [
    { text: "Seven (7)", hint: "Close, but that's not the right value here — the accepted answer is \"Two (2)\"." },
    { text: "Five (5)", hint: "Close, but that's not the right value here — the accepted answer is \"Two (2)\"." },
    { text: "Three (3)", hint: "Close, but that's not the right value here — the accepted answer is \"Two (2)\"." },
  ],
  28: [
    { text: "Because senators oversee two states each", hint: "Each senator represents only one state — every state simply gets two Senate seats." },
    { text: "To match the number of Supreme Court justices assigned per state", hint: "The Supreme Court has nine justices total, assigned nationally rather than by state — unrelated to Senate seats." },
    { text: "Because the House also gives two seats per state", hint: "House seats are allocated by population, not fixed at two per state like the Senate." },
  ],
  30: [
    { text: "Donald J. Trump", hint: "He's the President, not the Speaker of the House — those are two separate positions in different branches of government." },
    { text: "John Roberts", hint: "He's the Chief Justice of the Supreme Court, a judicial branch position, not the Speaker of the House." },
    { text: "JD Vance", hint: "He's the Vice President, not the Speaker of the House." },
  ],
  31: [
    { text: "Residents of their state", hint: "Residents include non-citizens too — the accepted answer is specifically citizens of the state, not everyone who lives there." },
    { text: "Registered voters in their state", hint: "A senator represents all citizens of their state, not just the subset who are registered to vote." },
    { text: "All people in the United States", hint: "A senator represents their own state specifically — that's why each state gets two senators, not one senator for the whole country." },
  ],
  32: [
    { text: "Residents of their state", hint: "Residency alone doesn't grant the right to vote — electing a senator requires being a citizen registered to vote in that state." },
    { text: "All U.S. citizens", hint: "Only citizens registered to vote in that particular state elect its senators — citizens of other states don't get a vote in it." },
    { text: "The state legislature", hint: "That was true before the 17th Amendment (1913) — senators are directly elected by the state's citizens now, not chosen by the state legislature." },
  ],
  33: [
    { text: "Citizens of their entire state", hint: "That's who a senator represents — a House member represents only their specific congressional district within the state." },
    { text: "Only registered voters in their district", hint: "A representative represents all citizens in the district, not just those registered to vote." },
    { text: "People in neighboring districts", hint: "A representative's authority is limited to their own district, not neighboring ones." },
  ],
  34: [
    { text: "The state legislature", hint: "House members are elected directly by voters in their district, not appointed by the state legislature." },
    { text: "All voters in the state", hint: "Only voters within that specific congressional district elect a given representative, not the whole state." },
    { text: "The Electoral College", hint: "The Electoral College elects the president, not members of the House." },
  ],
  35: [
    { text: "Because those states have more senators", hint: "Every state has exactly two senators regardless of size — that has nothing to do with House seat totals." },
    { text: "Because those states joined the Union earlier", hint: "The order states joined has no bearing on how many House seats they get; population does." },
    { text: "Because those states cover more land area", hint: "Geographic size doesn't determine House representation; population does." },
  ],
  36: [
    { text: "Two (2) years", hint: "Close, but that's not the right value here — the accepted answer is \"Four (4) years\"." },
    { text: "Six (6) years", hint: "Close, but that's not the right value here — the accepted answer is \"Four (4) years\"." },
    { text: "Three (3) years", hint: "Close, but that's not the right value here — the accepted answer is \"Four (4) years\"." },
  ],
  37: [
    { text: "(Because of) the 5th Amendment", hint: "Close, but that's not the right value here — the accepted answer is \"(Because of) the 22nd Amendment\"." },
    { text: "(Because of) the 13th Amendment", hint: "Close, but that's not the right value here — the accepted answer is \"(Because of) the 22nd Amendment\"." },
    { text: "(Because of) the 25th Amendment", hint: "Close, but that's not the right value here — the accepted answer is \"(Because of) the 22nd Amendment\"." },
  ],
  38: [
    { text: "John Roberts", hint: "He's the Chief Justice of the Supreme Court, a judicial position, not the president." },
    { text: "Mike Johnson", hint: "He's the Speaker of the House, a legislative position, not the president." },
    { text: "JD Vance", hint: "He's the Vice President, the second-highest executive position, not the president himself." },
  ],
  39: [
    { text: "Mike Johnson", hint: "He's the Speaker of the House, not the Vice President." },
    { text: "John Roberts", hint: "He's the Chief Justice of the Supreme Court, not the Vice President." },
    { text: "Donald J. Trump", hint: "He's the President, not the Vice President." },
  ],
  40: [
    { text: "The Speaker of the House", hint: "The Speaker is next in line only if both the president and vice president can no longer serve — the vice president is first." },
    { text: "The Chief Justice", hint: "The Chief Justice has no role in presidential succession; that's set by the line of succession starting with the vice president." },
    { text: "Whoever wins a special election", hint: "No special election is held — the vice president automatically assumes the presidency." },
  ],
  41: [
    { text: "Writes new laws", hint: "Congress writes laws — the president can sign or veto them, but doesn't originate legislation." },
    { text: "Declares laws unconstitutional", hint: "That's the judicial branch's power through judicial review, not the president's." },
    { text: "Approves constitutional amendments", hint: "Amendments go through Congress and the states for ratification — the president has no formal role in the process." },
  ],
  42: [
    { text: "The Secretary of Defense", hint: "The Secretary manages the Defense Department under presidential authority, but the president holds the constitutional title of Commander in Chief." },
    { text: "The Speaker of the House", hint: "A legislative leadership role with no military command authority." },
    { text: "The Joint Chiefs of Staff", hint: "The military's top uniformed advisors, not the constitutional commander of the armed forces." },
  ],
  43: [
    { text: "The Speaker of the House", hint: "The Speaker leads the House and helps steer bills there, but only the president's signature makes a bill law." },
    { text: "The Chief Justice", hint: "The judiciary doesn't sign legislation into law — that's an executive function." },
    { text: "The Senate Majority Leader", hint: "A legislative leadership role — passing a bill through the Senate is different from signing it into law." },
  ],
  44: [
    { text: "The Vice President", hint: "The VP has no veto power — only the president can veto legislation." },
    { text: "The Supreme Court", hint: "The Court can strike down laws as unconstitutional through judicial review, but that's different from a veto, which happens before a bill becomes law." },
    { text: "The Senate", hint: "The Senate can vote against a bill, but a formal veto is a presidential power, not a legislative one." },
  ],
  45: [
    { text: "The Senate", hint: "The Senate confirms federal judges, but the president is the one who nominates and formally appoints them." },
    { text: "The Chief Justice", hint: "The Chief Justice has no appointment power over other federal judges — that's a presidential power." },
    { text: "State governors", hint: "Governors appoint state judges in some states, but federal judges are appointed at the federal level by the president." },
  ],
  46: [
    { text: "Supreme Court", hint: "The Supreme Court is part of the judicial branch, not the executive branch — it doesn't belong on a list of executive-branch parts." },
    { text: "(U.S.) Congress", hint: "Congress is the legislative branch, not a part of the executive branch — it's a separate branch entirely." },
    { text: "Chief Justice", hint: "The Chief Justice leads the Supreme Court, which sits in the judicial branch — not a part of the executive branch." },
  ],
  47: [
    { text: "Writes federal legislation", hint: "That's Congress's job — Cabinet members advise the president but don't write laws." },
    { text: "Confirms presidential nominees", hint: "That's the Senate's job — the Cabinet is made up of the nominees being confirmed, not the body doing the confirming." },
    { text: "Interprets the Constitution", hint: "That's the judicial branch's role, particularly the Supreme Court, not the Cabinet." },
  ],
  48: [
    { text: "Secretary of Tourism", hint: "There's no \"Secretary of Tourism\" in the real U.S. Cabinet — that department doesn't exist." },
    { text: "Secretary of Infrastructure", hint: "There's no \"Secretary of Infrastructure\" in the real U.S. Cabinet — that department doesn't exist." },
    { text: "Secretary of Technology", hint: "There's no \"Secretary of Technology\" in the real U.S. Cabinet — that department doesn't exist." },
  ],
  49: [
    { text: "It counts the popular vote nationwide to declare a winner.", hint: "The opposite, actually — the Electoral College is a compromise BETWEEN a national popular vote and congressional selection, not a body that simply tallies the popular vote." },
    { text: "It settles disputes between states.", hint: "That's a role of the federal courts — the Electoral College only has one job, electing the president, not resolving disputes." },
    { text: "It gives Congress the power to remove a president.", hint: "That's impeachment and removal, a Congressional power under the Constitution — the Electoral College doesn't remove presidents, it's how they get elected in the first place." },
  ],
  50: [
    { text: "The Senate", hint: "Part of the legislative branch, not the judicial branch." },
    { text: "The Cabinet", hint: "Part of the executive branch, not the judicial branch." },
    { text: "The Federal Reserve", hint: "An independent agency that manages monetary policy, not a court or part of the judicial branch." },
  ],
  51: [
    { text: "Passes federal budgets", hint: "That's a power of Congress, not the courts." },
    { text: "Enforces criminal law", hint: "That's carried out by executive agencies like the Justice Department, not the judicial branch's core role of interpreting law." },
    { text: "Nominates Supreme Court justices", hint: "That's the president's job — the judicial branch doesn't appoint its own members." },
  ],
  52: [
    { text: "U.S. Court of Appeals", hint: "An important federal appellate court, but its rulings can still be appealed to the Supreme Court." },
    { text: "U.S. District Court", hint: "The entry-level federal trial court — several levels of appeal sit above it." },
    { text: "State Supreme Court", hint: "The highest court within a single state, not the highest court in the country as a whole." },
  ],
  53: [
    { text: "Ten (10)", hint: "Close, but that's not the right value here — the accepted answer is \"Nine (9)\"." },
    { text: "Seven (7)", hint: "Close, but that's not the right value here — the accepted answer is \"Nine (9)\"." },
    { text: "Eleven (11)", hint: "Close, but that's not the right value here — the accepted answer is \"Nine (9)\"." },
  ],
  54: [
    { text: "Three (3)", hint: "Close, but that's not the right value here — the accepted answer is \"Five (5)\"." },
    { text: "Two (2)", hint: "Close, but that's not the right value here — the accepted answer is \"Five (5)\"." },
    { text: "Four (4)", hint: "Close, but that's not the right value here — the accepted answer is \"Five (5)\"." },
  ],
  55: [
    { text: "Ten (10) years", hint: "Federal judges below the Supreme Court are also appointed for life, not a fixed term like this." },
    { text: "Twenty (20) years", hint: "There's no fixed term for Supreme Court justices at all — lifetime appointment is the whole point of the constitutional protection." },
    { text: "Until age seventy (70)", hint: "There's no mandatory retirement age for Supreme Court justices — they serve for life unless they resign or are removed." },
  ],
  56: [
    { text: "Because there aren't enough qualified replacements", hint: "There's no shortage of qualified judges — lifetime tenure is a deliberate constitutional choice, not a practical necessity." },
    { text: "To save the cost of holding elections", hint: "Federal judges are appointed rather than elected, regardless of term length — and lifetime tenure exists to insulate them from politics, not to save money." },
    { text: "Because term limits can't legally be added", hint: "Congress and the states could amend the Constitution to add term limits — lifetime tenure exists by original design, not because change is impossible." },
  ],
  57: [
    { text: "Mike Johnson", hint: "He's the Speaker of the House, a legislative position, not the Chief Justice." },
    { text: "Donald J. Trump", hint: "He's the President, not the Chief Justice." },
    { text: "JD Vance", hint: "He's the Vice President, not the Chief Justice." },
  ],
  58: [
    { text: "Issue driver's licenses", hint: "That's a power reserved to the states, not the federal government." },
    { text: "Set up public schools", hint: "Education policy is primarily a state and local responsibility, not a federal-only power." },
    { text: "Conduct local elections", hint: "Running elections is administered at the state and local level, not exclusively by the federal government." },
  ],
  59: [
    { text: "Declare war", hint: "Only the federal government (Congress) can declare war — states have no authority to do so." },
    { text: "Print currency", hint: "Only the federal government can print money — states are constitutionally barred from doing this." },
    { text: "Negotiate treaties with foreign countries", hint: "Foreign policy and treaty-making are exclusively federal powers, not state ones." },
  ],
  60: [
    { text: "It guarantees freedom of speech and religion", hint: "That's the First Amendment's role, not the Tenth's." },
    { text: "It sets the process for amending the Constitution", hint: "That's Article V's role, not the Tenth Amendment's." },
    { text: "It limits the number of terms a president can serve", hint: "That's the 22nd Amendment's role, not the Tenth's." },
  ],
  63: [
    { text: "Citizens fifteen (15) and older (can vote).", hint: "Close, but that's not the right value here — the accepted answer is \"Citizens eighteen (18) and older (can vote).\"." },
    { text: "Citizens sixteen (16) and older (can vote).", hint: "Close, but that's not the right value here — the accepted answer is \"Citizens eighteen (18) and older (can vote).\"." },
    { text: "Citizens twenty (20) and older (can vote).", hint: "Close, but that's not the right value here — the accepted answer is \"Citizens eighteen (18) and older (can vote).\"." },
  ],
  64: [
    { text: "People who pay taxes", hint: "Paying taxes doesn't grant these rights — plenty of non-citizens pay taxes too; voting, running for federal office, and jury duty are tied to citizenship, not tax status." },
    { text: "Anyone living in the United States", hint: "Just living in the U.S. doesn't grant any of these — they're rights and duties tied to citizenship specifically." },
    { text: "Permanent residents", hint: "Permanent residents (green card holders) can live and work in the U.S., but voting in federal elections, running for federal office, and serving on a jury are reserved for citizens." },
  ],
  65: [
    { text: "The right to vote", hint: "Voting in federal elections is reserved for U.S. citizens, not everyone living in the country, unlike freedom of speech, assembly, and expression, which the First Amendment extends to all." },
    { text: "The right to run for federal office", hint: "Running for federal office is limited to citizens who meet age and residency requirements — it's not a right everyone living in the U.S. has, unlike the First Amendment freedoms." },
    { text: "The right to serve on a jury", hint: "Jury service is a duty and right reserved for U.S. citizens, not something extended to everyone living in the country." },
  ],
  66: [
    { text: "The President (of the United States)", hint: "The Pledge is a promise of loyalty to the nation itself, not to whoever currently holds the presidency — presidents change, but the Pledge's loyalty doesn't shift with them." },
    { text: "The state where we live", hint: "The Pledge is a national oath, not a state one — it pledges allegiance to \"the United States of America,\" not to any individual state." },
    { text: "The U.S. Constitution", hint: "Defending the Constitution is part of the naturalization Oath of Allegiance new citizens take — the Pledge itself is a shorter, separate promise of loyalty to the country as a nation." },
  ],
  67: [
    { text: "Pay a citizenship application fee", hint: "An administrative step in the naturalization process, not a promise made in the Oath itself." },
    { text: "Pass the civics and English exams", hint: "A prerequisite to naturalization, not a promise made during the Oath ceremony." },
    { text: "Vote in the next election", hint: "Voting is a right citizens gain, not a promise required by the Oath of Allegiance." },
  ],
  68: [
    { text: "Be born in the United States, under the conditions set by the 19th Amendment", hint: "Close, but that's not the right value here — the accepted answer is \"Be born in the United States, under the conditions set by the 14th Amendment\"." },
    { text: "Be born in the United States, under the conditions set by the 1st Amendment", hint: "Close, but that's not the right value here — the accepted answer is \"Be born in the United States, under the conditions set by the 14th Amendment\"." },
    { text: "Be born in the United States, under the conditions set by the 15th Amendment", hint: "Close, but that's not the right value here — the accepted answer is \"Be born in the United States, under the conditions set by the 14th Amendment\"." },
  ],
  69: [
    { text: "Serve on a jury", hint: "A civic duty, but it's compulsory when called, not a voluntary form of participation like voting or campaigning." },
    { text: "Register for Selective Service", hint: "A legal requirement for eligible men, not a voluntary form of civic participation." },
    { text: "Pay property taxes", hint: "A legal financial obligation, not an act of civic participation like voting or running for office." },
  ],
  70: [
    { text: "Watch the news", hint: "Staying informed is a personal habit, not an act of service — it doesn't actively contribute to the country the way voting, serving in the military, or joining a community group does." },
    { text: "Recycle household waste", hint: "A responsible environmental habit, but not one of the ways USCIS credits as serving the country here — voting, military service, and civic work are." },
    { text: "Attend a sporting event", hint: "A private leisure activity — it doesn't serve the country the way voting, military service, or civic work does." },
  ],
  71: [
    { text: "To earn the right to vote", hint: "Voting rights aren't tied to whether someone pays taxes — they're tied to citizenship and age." },
    { text: "To qualify for a driver's license", hint: "A state-level requirement unrelated to whether federal taxes have been paid." },
    { text: "To become eligible for jury duty", hint: "Jury eligibility depends on citizenship and residency, not tax payment." },
  ],
  72: [
    { text: "To become eligible to vote", hint: "Voter eligibility depends on citizenship and age, not Selective Service registration." },
    { text: "To automatically qualify for federal financial aid", hint: "Registration can affect eligibility for some federal aid as a side effect, but that's not why the law requires it." },
    { text: "To be automatically considered for a government job", hint: "Registering for Selective Service doesn't grant automatic eligibility for any specific job — it's simply a legal requirement." },
  ],
  73: [
    { text: "Escaping the Great Depression", hint: "The Great Depression was in the 1930s, over a century after the colonial period — colonists couldn't have been escaping an event that hadn't happened yet." },
    { text: "Fighting in the Civil War", hint: "Colonists arrived in the 1600s–1700s, more than a century before the Civil War (1861–1865) — it couldn't have been their reason for coming." },
    { text: "Joining the gold rush", hint: "The California Gold Rush was in 1848–1855, long after the original 13 colonies were founded — that's not why colonists came to America." },
  ],
  74: [
    { text: "Pilgrims", hint: "The Pilgrims were English colonists who arrived in 1620 — they were Europeans themselves, not the people who lived in America before Europeans arrived." },
    { text: "Africans", hint: "Enslaved Africans began being brought to America starting in 1619, after Europeans had already arrived — not before." },
    { text: "The Founding Fathers", hint: "The Founding Fathers were American colonial leaders of the later 1700s — they came after Europeans had already arrived, not before." },
  ],
  75: [
    { text: "Irish immigrants", hint: "Irish immigrants came to America largely by choice, especially during the Great Famine of the 1840s — they weren't taken and sold as slaves." },
    { text: "Chinese laborers", hint: "Chinese immigrants came to the U.S. mostly in the mid-1800s to work as railroad laborers — they're not the group taken and sold into slavery." },
    { text: "American Indians", hint: "American Indians were the people already living in America before Europeans arrived — the accepted answer here is Africans, forcibly brought to America and sold into slavery." },
  ],
  76: [
    { text: "World War I", hint: "Fought in the early 1900s against Germany and its allies, over a century after American independence was won." },
    { text: "War in Afghanistan", hint: "Part of the 21st-century War on Terror, centuries removed from the fight for independence." },
    { text: "Spanish-American War", hint: "Fought in 1898 over Spanish colonial territories, unrelated to independence from Britain." },
  ],
  77: [
    { text: "Building the transcontinental railroad", hint: "The transcontinental railroad was completed in 1869, nearly 100 years after independence was declared — not a reason for declaring it." },
    { text: "Fighting in the Civil War", hint: "The Civil War happened almost a century after independence was declared in 1776 — it can't be a reason for declaring it." },
    { text: "The Great Depression", hint: "The Great Depression happened in the 1930s, over 150 years after 1776 — it has nothing to do with why independence was declared." },
  ],
  78: [
    { text: "(Franklin) Roosevelt", hint: "A 20th-century president known for leading through the Great Depression and WWII, over 150 years after the Declaration was written." },
    { text: "Susan B. Anthony", hint: "A 19th-century women's suffrage leader, not involved in drafting the Declaration in 1776." },
    { text: "(John) Jay", hint: "A Founding Father and co-author of the Federalist Papers, not the writer of the Declaration." },
  ],
  79: [
    { text: "1787", hint: "The year the Constitution was written, eleven years after the Declaration was adopted." },
    { text: "1929", hint: "The year of the stock market crash that triggered the Great Depression, over 150 years after the Declaration." },
    { text: "1870", hint: "The year the 15th Amendment extended voting rights regardless of race, nearly a century after the Declaration." },
  ],
  80: [
    { text: "Intolerable (Coercive) Acts", hint: "British laws passed in 1774 that helped spark the Revolution — a cause of the war, not an event within it." },
    { text: "Saved (or preserved) the Union", hint: "Describes the outcome of the Civil War, nearly a century later, not an event of the American Revolution." },
    { text: "(Battle of) Antietam/Sharpsburg", hint: "A Civil War battle fought in 1862, not part of the Revolutionary War." },
  ],
  81: [
    { text: "Florida", hint: "Acquired from Spain in 1819, decades after the original 13 colonies had already become states — it wasn't one of them." },
    { text: "Louisiana", hint: "Part of the territory the U.S. bought from France in 1803 and didn't become a state until 1812 — not one of the original 13." },
    { text: "Washington, D.C.", hint: "The federal capital, not a state at all — the original 13 were states, and D.C. has never been one." },
  ],
  82: [
    { text: "Declaration of Independence", hint: "Written in 1776, eleven years before the Constitutional Convention drafted the Constitution in 1787." },
    { text: "Articles of Confederation", hint: "The first U.S. governing document, adopted in 1781, which the Constitution replaced in 1787." },
    { text: "Intolerable (Coercive) Acts", hint: "British laws passed in 1774, not a U.S. founding document at all." },
  ],
  83: [
    { text: "(Franklin) Roosevelt", hint: "A 20th-century president, over a century after the Federalist Papers were written in 1787–88." },
    { text: "(Thomas) Jefferson", hint: "Didn't write any of the Federalist Papers — he was in France as a diplomat while they were being written." },
    { text: "Lucretia Mott", hint: "A 19th-century women's rights leader, not involved in writing the Federalist Papers." },
  ],
  84: [
    { text: "Doubled the size of the United States (Louisiana Purchase)", hint: "That's about Thomas Jefferson's presidency (the Louisiana Purchase), not the Federalist Papers." },
    { text: "British soldiers stayed in Americans’ houses (boarding, quartering)", hint: "That's a reason colonists gave for declaring independence from Britain, not why the Federalist Papers mattered." },
    { text: "First Postmaster General of the United States", hint: "That's a fact about Benjamin Franklin, not about the Federalist Papers." },
  ],
  85: [
    { text: "First Secretary of the Treasury", hint: "That's Alexander Hamilton's legacy, not Benjamin Franklin's." },
    { text: "First president of the United States", hint: "That's George Washington, not Benjamin Franklin." },
    { text: "Wrote the Declaration of Independence", hint: "That's Thomas Jefferson's achievement, not Franklin's (though Franklin helped edit it)." },
  ],
  86: [
    { text: "Delivered the Gettysburg Address", hint: "That's Abraham Lincoln, during the Civil War, nearly a century after Washington's presidency." },
    { text: "“Father of the Constitution”", hint: "That's James Madison's title, not Washington's." },
    { text: "Wrote the Declaration of Independence", hint: "That's Thomas Jefferson's achievement, not Washington's." },
  ],
  87: [
    { text: "First president of the United States", hint: "That's George Washington, not Thomas Jefferson." },
    { text: "First Secretary of the Treasury", hint: "That's Alexander Hamilton, not Thomas Jefferson." },
    { text: "“Father of the Constitution”", hint: "That's James Madison's title, not Jefferson's." },
  ],
  88: [
    { text: "“Father of Our Country”", hint: "That's George Washington's title, not James Madison's." },
    { text: "First Secretary of the Treasury", hint: "That's Alexander Hamilton, not James Madison." },
    { text: "Founded the University of Virginia", hint: "That's Thomas Jefferson's legacy, not Madison's." },
  ],
  89: [
    { text: "Fourth president of the United States", hint: "That's James Madison — Hamilton was never president." },
    { text: "Third president of the United States", hint: "That's Thomas Jefferson, not Alexander Hamilton." },
    { text: "Wrote the Declaration of Independence", hint: "That's Thomas Jefferson's achievement, not Hamilton's." },
  ],
  90: [
    { text: "Florida", hint: "Acquired from Spain in 1819, not France, in a separate transaction." },
    { text: "Alaska", hint: "Purchased from Russia in 1867, nearly 65 years after the Louisiana Purchase." },
    { text: "Texas", hint: "Annexed from the Republic of Texas in 1845, not purchased from France." },
  ],
  91: [
    { text: "War in Afghanistan", hint: "Part of the 21st-century War on Terror, nearly two centuries after the 1800s." },
    { text: "World War I", hint: "Fought in the early 1900s, not the 1800s." },
    { text: "American Revolution", hint: "Fought in the 1770s–80s, ending before the 1800s began." },
  ],
  92: [
    { text: "American Revolution", hint: "Fought against Britain in the 1770s–80s, not a war between the North and South." },
    { text: "War in Iraq", hint: "A 21st-century conflict, unrelated to the North-South divide." },
    { text: "Spanish-American War", hint: "Fought against Spain in 1898, not a war between American regions." },
  ],
  93: [
    { text: "War for (American) Independence", hint: "Describes the entire Revolutionary War, not a specific Civil War event." },
    { text: "Boston Tea Party (Tea Act)", hint: "A Revolutionary-era protest in 1773, nearly 90 years before the Civil War." },
    { text: "Valley Forge (Encampment)", hint: "The Continental Army's winter encampment during the Revolutionary War, not a Civil War event." },
  ],
  94: [
    { text: "Third president of the United States", hint: "That's Thomas Jefferson — Lincoln was the 16th president." },
    { text: "Helped write the Declaration of Independence", hint: "That's Thomas Jefferson and the other Founders, nearly 90 years before Lincoln's presidency." },
    { text: "Fourth president of the United States", hint: "That's James Madison, not Abraham Lincoln." },
  ],
  95: [
    { text: "Fought for civil rights", hint: "Describes the 1950s–60s civil rights movement, nearly a century after the Emancipation Proclamation." },
    { text: "Established the Supreme Court", hint: "The Court was created by the Constitution in 1789, decades before the Emancipation Proclamation." },
    { text: "Ended the war with Britain", hint: "That's what the Treaty of Paris did in 1783, unrelated to the Emancipation Proclamation." },
  ],
  96: [
    { text: "War in Afghanistan", hint: "A 21st-century conflict, nearly 150 years after slavery ended." },
    { text: "Spanish-American War", hint: "Fought in 1898, over 30 years after slavery was abolished." },
    { text: "American Revolution", hint: "Fought in the 1770s–80s, when slavery was still legal throughout the colonies." },
  ],
  97: [
    { text: "25th Amendment", hint: "Close, but that's not the right value here — the accepted answer is \"14th Amendment\"." },
    { text: "27th Amendment", hint: "Close, but that's not the right value here — the accepted answer is \"14th Amendment\"." },
    { text: "13th Amendment", hint: "Close, but that's not the right value here — the accepted answer is \"14th Amendment\"." },
  ],
  98: [
    { text: "1920", hint: "That's when women got the right to vote (19th Amendment) — men's voting rights regardless of race came earlier, with the 15th Amendment in 1870." },
    { text: "With the 19th Amendment", hint: "The 19th Amendment (1920) guaranteed women's right to vote — the 15th Amendment (1870) is the one that covered men regardless of race." },
    { text: "After World War I", hint: "That's roughly when women's suffrage passed — the 15th Amendment, extending voting rights to men regardless of race, came decades earlier, after the Civil War." },
  ],
  99: [
    { text: "Publius", hint: "The shared pen name used by the authors of the Federalist Papers in the 1780s, not a person involved in 1800s women's rights activism." },
    { text: "(Thomas) Jefferson", hint: "Drafted the Declaration of Independence in 1776, decades before the women's rights movement began." },
    { text: "(Franklin) Roosevelt", hint: "A 20th-century president, over a century after the 1800s women's rights movement." },
  ],
  100: [
    { text: "War in Iraq", hint: "Began in 2003, in the 2000s — after, not during, the 1900s." },
    { text: "American Revolution", hint: "Fought in the 1770s–80s, not the 1900s." },
    { text: "Civil War", hint: "Fought in the 1860s, not the 1900s." },
  ],
  101: [
    { text: "To force the Iraqi military from Kuwait", hint: "That's why the U.S. entered the 1991 Persian Gulf War, decades after World War I." },
    { text: "To stop the spread of communism", hint: "That was the reason for U.S. involvement in Korea and Vietnam — the Soviet Union didn't yet exist when World War I began." },
    { text: "To oppose the Axis Powers (Germany, Italy, and Japan)", hint: "The Axis alliance was a World War II coalition, formed decades after World War I ended." },
  ],
  102: [
    { text: "1870", hint: "That's when the 15th Amendment gave men the right to vote regardless of race — women's suffrage came later, with the 19th Amendment in 1920." },
    { text: "During Reconstruction", hint: "Reconstruction followed the Civil War in the 1860s–70s — women's suffrage came decades later, in 1920." },
    { text: "With the 15th Amendment", hint: "The 15th Amendment (1870) covered men's voting rights regardless of race — women's suffrage came with the 19th Amendment instead." },
  ],
  103: [
    { text: "A period of rapid economic growth", hint: "The opposite, actually — the Great Depression was the longest economic recession in modern U.S. history, not a boom." },
    { text: "A worldwide pandemic", hint: "The Great Depression was an economic collapse, not a disease outbreak." },
    { text: "A war between the North and South", hint: "That's the Civil War — the Great Depression was an economic crisis, not a war." },
  ],
  104: [
    { text: "War of 1812", hint: "A military conflict fought over a century earlier, not the start of the Great Depression." },
    { text: "1920", hint: "The year women gained the right to vote, nine years before the Depression began." },
    { text: "July 4, 1776", hint: "The date the Declaration of Independence was adopted, over 150 years before the Great Depression." },
  ],
  105: [
    { text: "(Thomas) Jefferson", hint: "Served as the third president in the early 1800s, over a century before the Great Depression and WWII." },
    { text: "Susan B. Anthony", hint: "A 19th-century women's suffrage leader, never president." },
    { text: "(James) Madison", hint: "Served as the fourth president in the early 1800s, over a century before the Great Depression and WWII." },
  ],
  106: [
    { text: "The assassination of a world leader", hint: "That's what triggered World War I (the assassination of Archduke Franz Ferdinand) — World War II began for different reasons, including the attack on Pearl Harbor." },
    { text: "To stop the spread of communism", hint: "That was the rationale for U.S. involvement in the Cold War and conflicts like Korea and Vietnam — World War II predates the Cold War." },
    { text: "Terrorists attacked the United States", hint: "That describes the September 11, 2001 attacks — the U.S. entered World War II because of the Japanese attack on Pearl Harbor in 1941, a different event." },
  ],
  107: [
    { text: "Japanese attacked Pearl Harbor", hint: "That's an event of World War II, not something Eisenhower personally did." },
    { text: "16th president of the United States", hint: "That's Abraham Lincoln — Eisenhower was the 34th president." },
    { text: "Led the United States during the Civil War", hint: "That's Abraham Lincoln, in the 1860s, nearly a century before Eisenhower's presidency." },
  ],
  108: [
    { text: "Japan", hint: "Japan was a U.S. adversary in World War II, a war that ended before the Cold War began — by the Cold War, Japan was a U.S. ally, not its rival." },
    { text: "Cuba", hint: "Cuba allied with the Soviet Union during the Cold War (the Cuban Missile Crisis was part of that standoff), but it wasn't itself the superpower the U.S. was rivaling." },
    { text: "China", hint: "China was a Cold War-era communist power too, but the defining rivalry — the arms race, the space race, the standoff at the center of the Cold War — was with the Soviet Union specifically." },
  ],
  109: [
    { text: "Terrorism", hint: "Terrorism became a major U.S. concern after the September 11, 2001 attacks — during the Cold War, the central concern was the spread of communism." },
    { text: "Immigration", hint: "Not a defining Cold War-era concern — the Cold War was primarily about countering the spread of communism and the risk of nuclear war." },
    { text: "Economic recession", hint: "That's the Great Depression's defining feature, not a Cold War-era concern." },
  ],
  110: [
    { text: "To force the Iraqi military from Kuwait", hint: "That's the reason for the 1991 Persian Gulf War, not the Korean War." },
    { text: "Japanese attacked Pearl Harbor", hint: "That's why the U.S. entered World War II in 1941, not the Korean War, which began in 1950." },
    { text: "Because Germany attacked U.S. (civilian) ships", hint: "That's why the U.S. entered World War I in 1917, not the Korean War." },
  ],
  111: [
    { text: "Because Germany attacked U.S. (civilian) ships", hint: "That's why the U.S. entered World War I, decades before Vietnam." },
    { text: "Japanese attacked Pearl Harbor", hint: "That's why the U.S. entered World War II, decades before Vietnam." },
    { text: "To force the Iraqi military from Kuwait", hint: "That's why the U.S. entered the Persian Gulf War in 1991, not Vietnam." },
  ],
  112: [
    { text: "Writer of the Declaration of Independence", hint: "That's Thomas Jefferson in 1776 — unrelated to the 1950s–60s civil rights movement." },
    { text: "Led the United States during the Civil War", hint: "That's Abraham Lincoln in the 1860s, generations before the civil rights movement." },
    { text: "Freed the slaves (Emancipation Proclamation)", hint: "That's Abraham Lincoln's Emancipation Proclamation during the Civil War, generations before the civil rights movement." },
  ],
  113: [
    { text: "Freed the slaves (Emancipation Proclamation)", hint: "That's Abraham Lincoln's legacy, nearly a century before King's activism." },
    { text: "Founded the first free public libraries", hint: "That's Benjamin Franklin's legacy, unrelated to King." },
    { text: "16th president of the United States", hint: "That's Abraham Lincoln — King was never president." },
  ],
  114: [
    { text: "To stop the spread of communism", hint: "That was the reason for U.S. involvement in Korea and Vietnam, not the 1991 Gulf War." },
    { text: "Because Germany attacked U.S. (civilian) ships", hint: "That's why the U.S. entered World War I, not the Gulf War." },
    { text: "Japanese attacked Pearl Harbor", hint: "That's why the U.S. entered World War II, not the Gulf War." },
  ],
  115: [
    { text: "The stock market crash that started the Great Depression", hint: "That happened in 1929, not on September 11, 2001." },
    { text: "The bombing of Pearl Harbor", hint: "That's what brought the U.S. into World War II, in 1941 — a different event, decades before September 11, 2001." },
    { text: "The assassination of a U.S. president", hint: "No U.S. president was assassinated on September 11, 2001 — that date is defined by the terrorist attacks on the World Trade Center and Pentagon." },
  ],
  116: [
    { text: "(Persian) Gulf War", hint: "Fought in 1991, a decade before the September 11 attacks." },
    { text: "War for (American) Independence", hint: "Fought in the 1770s–80s, centuries before September 11." },
    { text: "Spanish-American War", hint: "Fought in 1898, over a century before September 11." },
  ],
  117: [
    { text: "Pilgrims", hint: "The Pilgrims were English colonists who arrived in 1620, not an American Indian tribe." },
    { text: "Puritans", hint: "The Puritans were English colonists, not an American Indian tribe." },
    { text: "Continental Army", hint: "The Continental Army was the colonial military force during the Revolutionary War, not an American Indian tribe." },
  ],
  118: [
    { text: "Gunpowder", hint: "Gunpowder was invented in ancient China, centuries before America existed — not an American innovation." },
    { text: "Penicillin", hint: "Penicillin was discovered by Alexander Fleming, a British scientist, in 1928 — not an American innovation." },
    { text: "The printing press", hint: "The printing press was invented by Johannes Gutenberg in Germany in the 1400s, centuries before the United States existed." },
  ],
  119: [
    { text: "New York City", hint: "New York City was an early U.S. capital (1785–1790) — today's capital is Washington, D.C." },
    { text: "Philadelphia", hint: "Philadelphia served as the U.S. capital for a time in the 1790s, but Washington, D.C. is the capital today." },
    { text: "Boston", hint: "Boston was never the U.S. capital — Washington, D.C. is." },
  ],
  120: [
    { text: "Boston Harbor", hint: "The Statue of Liberty is in New York Harbor, not Boston Harbor." },
    { text: "The National Mall (Washington, D.C.)", hint: "The Statue of Liberty stands on Liberty Island in New York Harbor, not on the National Mall." },
    { text: "Ellis Island", hint: "Ellis Island is the nearby former immigration station — the Statue of Liberty stands on Liberty Island." },
  ],
  121: [
    { text: "(Because there is) one star for each state", hint: "That explains the flag's 50 stars, not its 13 stripes — a different feature of the flag." },
    { text: "The Star-Spangled Banner", hint: "That's the name of the national anthem, not a reason for the number of stripes on the flag." },
    { text: "(Because there are) 50 states", hint: "That's why the flag has 50 stars — the 13 stripes represent the original colonies instead." },
  ],
  122: [
    { text: "Out of many, one", hint: "That's the meaning of the motto \"E Pluribus Unum,\" not a reason for the number of stars on the flag." },
    { text: "(Because the stripes) represent the original colonies", hint: "That explains the flag's stripes, not its stars." },
    { text: "(Because there were) 13 original colonies", hint: "That's why the flag has 13 stripes — the 50 stars represent the current states instead." },
  ],
  123: [
    { text: "America the Beautiful", hint: "A well-known patriotic song, but not the official national anthem — that's \"The Star-Spangled Banner.\"" },
    { text: "God Bless America", hint: "A patriotic song written by Irving Berlin, but not the official national anthem." },
    { text: "My Country, 'Tis of Thee", hint: "An early American patriotic song, but not the official national anthem." },
  ],
  124: [
    { text: "In God We Trust", hint: "That's a different U.S. motto (the current official one) — not the meaning of \"E Pluribus Unum.\"" },
    { text: "United we stand", hint: "A well-known patriotic phrase, but not the actual translation of \"E Pluribus Unum.\"" },
    { text: "Liberty and justice for all", hint: "That's from the Pledge of Allegiance, not the translation of \"E Pluribus Unum.\"" },
  ],
  125: [
    { text: "A holiday to honor soldiers who died in military service", hint: "That's Memorial Day, not Independence Day." },
    { text: "A holiday honoring workers and the labor movement", hint: "That's Labor Day, not Independence Day." },
    { text: "A holiday to honor people who have served (in the U.S. military)", hint: "That's Veterans Day, not Independence Day." },
  ],
  126: [
    { text: "Groundhog Day", hint: "Groundhog Day (February 2) is a popular folk tradition, not an official federal holiday." },
    { text: "Flag Day", hint: "Flag Day (June 14) honors the U.S. flag, but the eleven official federal holidays don't include it." },
    { text: "St. Patrick's Day", hint: "St. Patrick's Day (March 17) is a widely celebrated cultural holiday, but the official federal holidays don't include it." },
  ],
  127: [
    { text: "A holiday to honor people who have served (in the U.S. military)", hint: "That's Veterans Day — it honors everyone who served, not specifically those who died in service, which is what Memorial Day honors." },
    { text: "A holiday honoring workers and the labor movement", hint: "That's Labor Day, not Memorial Day." },
    { text: "A holiday to celebrate U.S. independence (from Britain)", hint: "That's Independence Day, not Memorial Day." },
  ],
  128: [
    { text: "A holiday to celebrate U.S. independence (from Britain)", hint: "That's Independence Day, not Veterans Day." },
    { text: "A holiday honoring workers and the labor movement", hint: "That's Labor Day, not Veterans Day." },
    { text: "A holiday to honor soldiers who died in military service", hint: "That's Memorial Day — Veterans Day honors everyone who served, living or dead, not specifically those who died." },
  ],
};

function inventedVariants(question: CivicsQuestion, rng: () => number): Distractor[] {
  const curated = CURATED_DISTRACTORS[question.num];
  if (curated) return seededShuffle(curated, rng);
  if (question.num === 48) {
    return seededShuffle(INVENTED_CABINET_DEPARTMENTS, rng).map((department) => ({
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

// The `power-action` kind mixes two grammatically incompatible answer families — third-person
// "the branch DOES this" phrasings ("Writes laws", "Vetoes bills") and bare infinitive/imperative
// phrasings ("Declare war", "Vote") — plus a couple of bare noun-phrase titles ("Chief diplomat").
// Nothing about `shapeOf` tells them apart (both are just "text"), so without this, a distractor
// pool built from the whole kind can hand a "-s" conjugated question ("Signs bills into law")
// wrong choices like "Approve zoning and land use" or "Chief diplomat" — technically topical, but
// a dead giveaway by grammar alone, or a phrase that doesn't answer a "what does it do" question
// at all. This is a closed, hand-verified list of every first word that actually appears among
// this dataset's power-action answers (see civicsData.ts), not a general grammar classifier.
const CONJUGATED_VERB_STARTS = new Set([
  "advises", "appoints", "decides", "declares", "enforces", "explains", "makes", "resolves",
  "reviews", "signs", "vetoes", "writes",
]);
const INFINITIVE_VERB_STARTS = new Set([
  "approve", "be", "contact", "create", "declare", "defend", "give", "help", "join", "make",
  "mint", "obey", "pay", "print", "provide", "run", "serve", "set", "support", "vote", "work",
  "write",
]);
const TITLE_PHRASE_STARTS = new Set(["chief", "commander"]);

function verbFormOf(answer: string): "conjugated" | "infinitive" | "title" | null {
  const firstWord = answer.replace(/^\(/, "").split(/\s+/)[0]?.toLowerCase();
  if (!firstWord) return null;
  if (CONJUGATED_VERB_STARTS.has(firstWord)) return "conjugated";
  if (INFINITIVE_VERB_STARTS.has(firstWord)) return "infinitive";
  if (TITLE_PHRASE_STARTS.has(firstWord)) return "title";
  return null;
}

/** Fast per-string shape check, independent of the curated per-question `kind` — this lets a
 * stray numeric sub-answer (e.g. "1870" inside a question whose primary answer is a sentence)
 * still get matched against other numbers, instead of only ever matching its parent's kind. */
function shapeOf(answer: string): Shape {
  if (/\b(1[6-9]\d{2}|20\d{2})\b/.test(answer)) {
    // Only "year"-shaped when the year IS basically the answer (a bare year, or a short label
    // plus the year, like "The Great Crash (1929)") — not when it's one incidental detail buried
    // in an otherwise unrelated long phrase, like "Signed the Federal-Aid Highway Act of 1956
    // (Created the Interstate System)". Without this, that whole sentence gets swept into the
    // year-shaped candidate pool for any bare-year question just because it contains a year.
    const wordCount = answer.replace(/\([^)]*\)/g, " ").trim().split(/\s+/).filter(Boolean).length;
    if (wordCount <= 5) return "year";
    return "text";
  }
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
  "war-event": "an important event within a war",
  "war-name": "the name of a war or military conflict",
  "war-reason": "the reason the U.S. entered a specific war",
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
  33: "who a member of the House of Representatives represents",
  34: "who elects members of the House of Representatives",
  35: "a reason some states have more representatives than others",
  56: "a reason justices serve for life",
  60: "the purpose of the 10th Amendment",
  64: "who can vote, run for office, and serve on a jury",
  65: "a right of everyone living in the United States",
  66: "what the Pledge of Allegiance shows loyalty to",
  67: "a promise made in the Oath of Allegiance",
  69: "a way Americans can participate in their democracy",
  70: "a way Americans can serve their country",
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
  95: "what the Emancipation Proclamation did",
  101: "a reason the U.S. entered World War I",
  103: "a description of the Great Depression",
  112: "what the civil rights movement did",
  113: "something Martin Luther King, Jr. is known for",
  108: "the United States’ main Cold War rival",
  109: "a U.S. concern during the Cold War",
  110: "a reason the U.S. entered the Korean War",
  111: "a reason the U.S. entered the Vietnam War",
  114: "a reason the U.S. entered the Persian Gulf War",
  115: "what happened on September 11, 2001",
  119: "the U.S. capital",
  120: "where the Statue of Liberty is",
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
  const kindMatch = candidate.kind === question.kind;
  const moduleMatch = candidate.moduleId === question.moduleId;
  if (kindMatch) s += 6;
  else if (KIND_FAMILIES[question.kind]?.includes(candidate.kind)) s += 3;
  if (candidate.shape === shapeOf(referenceAnswer)) s += 4;
  if (moduleMatch) s += 3;
  else if (candidate.category === categoryOf(question.moduleId)) s += 1;
  // A candidate that's BOTH the same kind and from the same module — i.e. the same narrow
  // sub-topic, not just a loosely related one — makes a much harder, more confusing distractor
  // than either match alone would suggest, so reward the combination on top of the individual
  // scores rather than just summing them.
  if (kindMatch && moduleMatch) s += 4;
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
  // Q31 "Who does a U.S. senator represent?" and Q32 "Who elects U.S. senators?" are two
  // genuinely different official questions, but their real answers are near-identical phrasing
  // ("citizens OF their state" vs "citizens FROM their state") — pooling one as a wrong choice
  // for the other reads as the same fact restated, not a meaningfully wrong option.
  31: ["citizens from their state"],
  32: ["citizens of their state", "people of their state"],
  // Q67 "Name two promises... Oath of Allegiance" and Q70 "What is one way Americans can serve
  // their country?" have the same near-identical-phrasing problem — "Obey the laws of the United
  // States" vs "Obey the law" restate the same fact, and normalize() doesn't collapse the extra
  // words, so without this the dedup-by-exact-normalized-text check misses it.
  67: ["obey the law"],
  70: ["obey the laws of the united states"],
  // Q33 "Who does a member of the House of Representatives represent?" and Q34 "Who elects
  // members of the House of Representatives?" have the same near-identical-phrasing problem as
  // Q31/32 above — "citizens IN their district" vs "citizens FROM their district" is the same
  // fact restated, not a meaningfully wrong option.
  // These are compared against normalize()'d text, which strips parentheticals — so the
  // exclusion string must already be in stripped form ("(congressional)" removed) or it silently
  // never matches anything.
  33: ["citizens from their district"],
  34: ["citizens in their district"],
  // "Declares war" (Q20's own phrasing of Congress's power) and "Declare war" (Q58's own answer,
  // a power reserved to the federal government) are the same real answer in two conjugations —
  // normalize() doesn't stem verb conjugation, so the dedup-by-normalized-text check doesn't
  // catch it, and Q58 was showing its own answer back to itself as a wrong choice. Also "Makes
  // the federal budget" (Q20's own power-of-Congress answer) and "Chief diplomat" (the power-of-
  // president answer, the same underlying fact as Q58's own "Set foreign policy") are each
  // themselves genuinely powers only the federal government has — not meaningfully wrong for a
  // "name a federal-only power" question, just filed under a different USCIS question number.
  58: ["declares war", "makes the federal budget", "chief diplomat"],
  // "After the Civil War" is a real answer, but to a question about WHEN something happened —
  // it's a time phrase, not a war name, so it doesn't grammatically fit as an answer to either
  // "name the war" question below (both expect a proper noun like "The Civil War" itself).
  92: ["after the civil war"],
  96: ["after the civil war"],
  // The "X is famous for many things" bio questions (85/86/94) otherwise pool cleanly from each
  // other (all job-title/achievement phrases), but these three specific candidates are the wrong
  // grammatical shape for "famous for" — a grievance-reason sentence, a group of people, and a
  // purpose statement, respectively, not something a person is "famous for."
  85: ["they did not have self-government"],
  86: ["people from africa", "after the civil war"],
  94: ["they supported passing the constitution", "boston tea party"],
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
  rng: () => number,
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

  for (const variant of seededShuffle(synthesizeVariants(referenceAnswer, rng), rng)) {
    if (distractors.length >= count) break;
    const normalized = normalize(variant);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    distractors.push({
      text: variant,
      hint: `Close, but that's not the right value here — the accepted answer is "${referenceAnswer}".`,
    });
  }

  for (const invented of seededShuffle(inventedVariants(question, rng), rng)) {
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
    const referenceVerbForm = verbFormOf(referenceAnswer);
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
        // Same idea for verb conjugation within power-action answers — see verbFormOf above.
        // Only filters when BOTH sides have a determinable form, so it never restricts kinds
        // this doesn't apply to.
        const candidateVerbForm = verbFormOf(answer);
        if (referenceVerbForm && candidateVerbForm && candidateVerbForm !== referenceVerbForm) {
          continue;
        }
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
    const ranked = seededShuffle(candidates, rng).sort(
      (a, b) => score(b, question, referenceAnswer) - score(a, question, referenceAnswer),
    );
    // At most one distractor per source question — two of that question's own answer phrasings
    // (e.g. "Louisiana" and "Louisiana Territory" from the same Louisiana Purchase question, or
    // "(Bombing of) Pearl Harbor" and "Japanese attacked Pearl Harbor" from the same WWII-entry
    // question) can both rank highly once they share kind+module with the target, but offering
    // both burns two choices on what's really the same underlying fact restated.
    const usedSourceQuestions = new Set<number>();
    for (const c of ranked) {
      if (distractors.length >= count) break;
      if (usedSourceQuestions.has(c.sourceQuestion.num)) continue;
      usedSourceQuestions.add(c.sourceQuestion.num);
      const sourceQ = c.sourceQuestion.question;
      const trailingPeriod = /[.?!]$/.test(sourceQ) ? "" : ".";
      const alreadyQuoted = /^[“"].*[”"]$/.test(c.answer);
      const quotedAnswer = alreadyQuoted ? c.answer : `"${c.answer}"`;
      const hint = topic
        ? `This question is asking about ${topic} — ${quotedAnswer} is the accepted answer for a different one: "${sourceQ}"${trailingPeriod}`
        : `That's actually the accepted answer to a different question — "${sourceQ}" — not this one.`;
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
  14: "Documents like the Declaration of Independence and the Mayflower Compact shaped the ideas the Constitution's framers built on.",
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
  85: "Benjamin Franklin was a prolific inventor, diplomat, and civic founder — including founding the first free public libraries in America.",
  86: "As the first president and commanding general of the Continental Army, Washington earned the title “Father of Our Country.”",
  87: "Jefferson is best known for drafting the Declaration of Independence, though he also served as the third president.",
  88: "Madison is credited as the Constitution's chief architect and later became the fourth president.",
  89: "Hamilton was the first Treasury Secretary and a key architect of the young nation's financial system.",
  90: "The Louisiana Purchase (1803) roughly doubled the size of the United States for about $15 million.",
  91: "The U.S. fought several wars in the 1800s, including the War of 1812, the Mexican-American War, and the Civil War.",
  92: "The Civil War (1861–1865) was fought between the Union (North) and the Confederacy (South), largely over slavery.",
  93: "The Civil War began with the Confederate attack on Fort Sumter in April 1861.",
  94: "Lincoln led the Union through the Civil War and issued the Emancipation Proclamation, declaring enslaved people in Confederate states free.",
  95: "The Emancipation Proclamation (1863) declared enslaved people in Confederate-held territory legally free.",
  96: "The Civil War (1861–1865) ended slavery in the United States — the Union's victory led directly to the 13th Amendment, which formally abolished it.",
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
  120: "The Statue of Liberty stands on Liberty Island in New York Harbor, a gift from France dedicated in 1886 — any of the accepted answers above describes that same location, so naming just one at your interview is enough.",
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
  // Seeded from the question's own number: the same question always produces the same distractor
  // set and the same choice order on every attempt, so a distractor set that's been reviewed and
  // approved stays exactly as reviewed, instead of being silently replaced by a fresh random draw
  // next time the question comes up. Different questions still get independently varied sets.
  const rng = mulberry32(question.num);
  const requiredCount = parseRequiredSelections(question.question, question.answers.length);
  const correctAnswers = question.answers.slice(0, requiredCount);
  const totalChoices = requiredCount <= 1 ? 4 : Math.min(8, requiredCount + 3);
  const distractors = generateDistractors(
    question,
    allQuestions,
    correctAnswers,
    totalChoices - requiredCount,
    rng,
  );

  type Entry = { text: string; hint: string | null };
  const entries: Entry[] = seededShuffle(
    [
      ...correctAnswers.map((text): Entry => ({ text, hint: null })),
      ...distractors.map((d): Entry => ({ text: d.text, hint: d.hint })),
    ],
    rng,
  );

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
