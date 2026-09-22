import { CIVICS_QUESTIONS, MODULES } from "../src/data/civicsData";
import { buildQuizItem } from "../src/lib/quiz";

const lines: string[] = [];
lines.push("# Civics Questions — Distractor Review");
lines.push("");
lines.push(
  "One generated sample per question. Distractor generation is deterministic (seeded by question number), so this is exactly what the app shows on every attempt — not a random sample. ✅ marks the correct choice(s); each wrong choice is followed by its hint.",
);
lines.push("");

const personalized: (typeof CIVICS_QUESTIONS)[number][] = [];

for (const module of MODULES) {
  lines.push(`## ${module.category}: ${module.title}`);
  lines.push("");
  for (const q of module.questions) {
    if (q.personalized) {
      personalized.push(q);
      continue;
    }
    const item = buildQuizItem(q, CIVICS_QUESTIONS);
    lines.push(`### Q${q.num}. ${q.question}`);
    if (item.requiredCount > 1) {
      lines.push(`*Select ${item.requiredCount}*`);
    }
    lines.push("");
    item.choices.forEach((choice, i) => {
      const isCorrect = item.correctIndexes.includes(i);
      if (isCorrect) {
        lines.push(`- ✅ **${choice}**`);
      } else {
        lines.push(`- ❌ ${choice}`);
        lines.push(`  - *${item.hints[i]}*`);
      }
    });
    if (item.explanation) {
      lines.push("");
      lines.push(`> ${item.explanation}`);
    }
    lines.push("");
  }
}

if (personalized.length > 0) {
  lines.push("## Personalized Questions");
  lines.push("");
  lines.push(
    "These have no fixed accepted answer — it depends on the learner's own state/district/officials — so they're excluded from quizzes and have no generated multiple-choice distractors. Listed here for completeness, not as multiple choice.",
  );
  lines.push("");
  for (const q of personalized) {
    lines.push(`### Q${q.num}. ${q.question}`);
    lines.push("");
    lines.push(`> ${q.answers[0]}`);
    lines.push("");
  }
}

console.log(lines.join("\n"));
