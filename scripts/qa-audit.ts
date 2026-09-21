import { CIVICS_QUESTIONS, MODULES } from "../src/data/civicsData";
import { buildQuizItem, parseRequiredSelections, pickQuizQuestions } from "../src/lib/quiz";

type Issue = { severity: "error" | "warn"; qnum: number; question: string; detail: string };
const issues: Issue[] = [];

function report(severity: Issue["severity"], q: (typeof CIVICS_QUESTIONS)[number], detail: string) {
  issues.push({ severity, qnum: q.num, question: q.question, detail });
}

// Run every question through buildQuizItem multiple times (randomness) to catch flaky issues.
const RUNS = 20;
for (const q of CIVICS_QUESTIONS) {
  for (let run = 0; run < RUNS; run++) {
    const item = buildQuizItem(q, CIVICS_QUESTIONS);

    // 1. requiredCount sanity
    const expectedRequired = parseRequiredSelections(q.question, q.answers.length);
    if (item.requiredCount !== expectedRequired) {
      report("error", q, `requiredCount mismatch: got ${item.requiredCount}, expected ${expectedRequired}`);
    }

    // 2. correct count matches requiredCount
    if (item.correctIndexes.length !== item.requiredCount) {
      report(
        "error",
        q,
        `correctIndexes.length (${item.correctIndexes.length}) != requiredCount (${item.requiredCount})`,
      );
    }

    // 3. choice count expectations
    const expectedTotal = item.requiredCount <= 1 ? 4 : Math.min(8, item.requiredCount + 3);
    if (item.choices.length !== expectedTotal) {
      report(
        "warn",
        q,
        `choices.length (${item.choices.length}) != expected total (${expectedTotal}) — distractor pool may be running dry`,
      );
    }

    // 4. no duplicate choices (case/paren/article-insensitive)
    const norm = (s: string) =>
      s.replace(/\([^)]*\)/g, " ").replace(/[.,'"“”]/g, "").replace(/\s+/g, " ").trim().toLowerCase().replace(/^(the|a|an)\s+/, "");
    const seen = new Map<string, number>();
    item.choices.forEach((c, i) => {
      const n = norm(c);
      if (seen.has(n)) {
        report("error", q, `duplicate choices (index ${seen.get(n)} and ${i}): "${item.choices[seen.get(n)!]}" / "${c}"`);
      }
      seen.set(n, i);
    });

    // 5. hints: every non-correct choice must have a hint; every correct choice must NOT have one
    item.choices.forEach((c, i) => {
      const isCorrect = item.correctIndexes.includes(i);
      const hint = item.hints[i];
      if (isCorrect && hint !== null) {
        report("error", q, `correct choice "${c}" unexpectedly has a hint: "${hint}"`);
      }
      if (!isCorrect && !hint) {
        report("error", q, `wrong choice "${c}" is missing a hint`);
      }
    });

    // 6. hint self-reference: a distractor's hint shouldn't quote the question's own text as the
    // "different question" (would happen if a hint's source question equals this one)
    item.hints.forEach((h) => {
      if (h?.includes(`"${q.question}"`)) {
        report("error", q, `hint self-references its own question: ${h}`);
      }
    });

    // 7. empty / malformed choice text
    item.choices.forEach((c, i) => {
      if (!c || !c.trim()) report("error", q, `empty choice at index ${i}`);
      if (/undefined|NaN|\[object/.test(c)) report("error", q, `malformed choice text: "${c}"`);
    });

    // 7b. grammar/formatting: no double spaces, no leading/trailing whitespace, no dangling
    // articles ("a" or "an" as the very last word — a sign a template swap truncated something),
    // balanced parens, and a sentence-appropriate opening character.
    item.choices.forEach((c, i) => {
      if (c !== c.trim()) report("error", q, `choice has leading/trailing whitespace: "${c}"`);
      if (/ {2,}/.test(c)) report("error", q, `choice has a double space: "${c}"`);
      if (/\s(a|an)$/i.test(c)) report("error", q, `choice ends on a dangling article: "${c}"`);
      const opens = (c.match(/\(/g) || []).length;
      const closes = (c.match(/\)/g) || []).length;
      if (opens !== closes) report("error", q, `unbalanced parentheses in choice: "${c}"`);
      if (!/^[A-Z0-9"“(]/.test(c)) report("warn", q, `choice doesn't open with a capital/quote/paren: "${c}"`);
    });
    item.hints.forEach((h) => {
      if (!h) return;
      if (/ {2,}/.test(h)) report("error", q, `hint has a double space: ${JSON.stringify(h)}`);
      if (/""|\.\.|,,/.test(h)) report("error", q, `hint has doubled punctuation: ${JSON.stringify(h)}`);
      const opens = (h.match(/\(/g) || []).length;
      const closes = (h.match(/\)/g) || []).length;
      if (opens !== closes) report("error", q, `unbalanced parentheses in hint: ${JSON.stringify(h)}`);
    });

    // 8. correct answer text itself must appear among choices (sanity)
    const correctTexts = item.correctIndexes.map((i) => item.choices[i]);
    for (const expected of q.answers.slice(0, item.requiredCount)) {
      if (!correctTexts.some((c) => norm(c) === norm(expected))) {
        report("error", q, `expected correct answer "${expected}" not found among rendered correct choices`);
      }
    }

    // 8b. a choice marked WRONG must never be one of THIS question's own accepted answers — even
    // one that isn't the particular slice being tested as correct right now. Two USCIS questions
    // can legitimately share an accepted answer (both "serve their country" and "civic
    // participation" accept "Run for office"); if a distractor pulled from a sibling question
    // happens to also be a real answer to the CURRENT one, marking it wrong is an actual content
    // bug, not just an imprecise distractor.
    const acceptedSet = new Set(q.answers.map(norm));
    item.choices.forEach((c, i) => {
      const isMarkedCorrect = item.correctIndexes.includes(i);
      if (!isMarkedCorrect && acceptedSet.has(norm(c))) {
        report(
          "error",
          q,
          `choice "${c}" is marked wrong but is one of this question's OWN accepted answers`,
        );
      }
    });
  }
}

// 9. hint honesty: no hint may assert a wrong pick is categorically false ("X isn't a person's
// name," "X isn't something the Constitution does"). Two different ways that turned out to be
// false, not just imprecise: (a) same-kind candidates plainly ARE that kind, just the wrong one
// ("(John) Jay" IS a person's name); (b) for open-ended "name one"/"why" questions, a sibling
// question's answer can be a true fact about the SAME subject that USCIS just credits under a
// different question number ("Checks and balances" really is something the Constitution does —
// it's simply the credited answer for a different question). So the rule is structural: hints
// state the topic and attribute the pick to its real question, and never negate.
for (const q of CIVICS_QUESTIONS) {
  for (let run = 0; run < 3; run++) {
    const item = buildQuizItem(q, CIVICS_QUESTIONS);
    item.hints.forEach((hint) => {
      if (hint && /\bisn'?t\b/i.test(hint)) {
        report("error", q, `hint makes a negation claim (banned): ${JSON.stringify(hint)}`);
      }
    });
  }
}

// 10. invented content must never accidentally collide with a real accepted answer anywhere in
// the data set — if it did, "invented" would actually be misinforming (claiming a real fact is
// fabricated) or duplicating (offering the same text as both a wrong AND some other question's
// correct answer, which is confusing even if not strictly a logic bug).
const norm3 = (s: string) =>
  s.replace(/\([^)]*\)/g, " ").replace(/[.,'"“”]/g, "").replace(/\s+/g, " ").trim().toLowerCase().replace(/^(the|a|an)\s+/, "");
const allRealAnswers = new Set<string>();
for (const q of CIVICS_QUESTIONS) {
  for (const a of q.answers) allRealAnswers.add(norm3(a));
}
for (const q of CIVICS_QUESTIONS) {
  for (let run = 0; run < 5; run++) {
    const item = buildQuizItem(q, CIVICS_QUESTIONS);
    item.choices.forEach((c, i) => {
      const hint = item.hints[i];
      if (hint && hint.includes("doesn't exist") && allRealAnswers.has(norm3(c))) {
        report("error", q, `invented distractor "${c}" collides with a REAL accepted answer elsewhere in the data set`);
      }
    });
  }
}

// Module-level checks
for (const m of MODULES) {
  if (m.questions.length === 0) {
    issues.push({ severity: "error", qnum: -1, question: m.title, detail: `module "${m.id}" has zero questions` });
  }
}
const totalQ = MODULES.reduce((n, m) => n + m.questions.length, 0);
if (totalQ !== 128) {
  issues.push({ severity: "error", qnum: -1, question: "-", detail: `MODULES total questions = ${totalQ}, expected 128` });
}

// pickQuizQuestions never returns personalized questions
for (let i = 0; i < 20; i++) {
  const picked = pickQuizQuestions(CIVICS_QUESTIONS, 20);
  for (const q of picked) {
    if (q.personalized) issues.push({ severity: "error", qnum: q.num, question: q.question, detail: "personalized question was picked for a quiz session" });
  }
}

// Print report
const errors = issues.filter((i) => i.severity === "error");
const warns = issues.filter((i) => i.severity === "warn");

console.log(`\n=== QA AUDIT: ${CIVICS_QUESTIONS.length} questions x ${RUNS} runs ===`);
console.log(`Errors: ${errors.length}   Warnings: ${warns.length}\n`);

function printGroup(list: Issue[], label: string) {
  if (list.length === 0) return;
  console.log(`--- ${label} ---`);
  const byQ = new Map<number, Issue[]>();
  for (const i of list) {
    if (!byQ.has(i.qnum)) byQ.set(i.qnum, []);
    byQ.get(i.qnum)!.push(i);
  }
  for (const [qnum, group] of byQ) {
    console.log(`Q${qnum}: ${group[0].question}`);
    const uniqueDetails = Array.from(new Set(group.map((g) => g.detail)));
    for (const d of uniqueDetails) console.log(`   - ${d}`);
  }
  console.log();
}

printGroup(errors, "ERRORS");
printGroup(warns, "WARNINGS");
