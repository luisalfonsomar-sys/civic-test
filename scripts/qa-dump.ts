import { CIVICS_QUESTIONS } from "../src/data/civicsData";
import { buildQuizItem } from "../src/lib/quiz";

const targetKinds = new Set(["amendment", "duration", "count", "year"]);
const targets = CIVICS_QUESTIONS.filter(
  (q) => targetKinds.has(q.kind) || q.question.match(/\b(name|what is|what are|describe|identify)\s+(?!the\s)(one|two|three|four|five)\b/i),
);

for (const q of targets) {
  const item = buildQuizItem(q, CIVICS_QUESTIONS);
  console.log(`\nQ${q.num} [${q.kind}, required=${item.requiredCount}]: ${q.question}`);
  item.choices.forEach((c, i) => {
    const correct = item.correctIndexes.includes(i);
    const marker = correct ? "✓" : " ";
    console.log(`  [${marker}] ${c}`);
    if (!correct) console.log(`      hint: ${item.hints[i]}`);
  });
}
