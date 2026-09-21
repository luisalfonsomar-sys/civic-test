import { CIVICS_QUESTIONS, MODULES } from "../src/data/civicsData";
import { buildQuizItem } from "../src/lib/quiz";

const lines: string[] = [];
lines.push("# Civics Questions — Distractor Review");
lines.push("");
lines.push(
  "One generated sample per question (distractors are randomized per quiz attempt, so re-running the app will show different wrong-choice combinations than what's listed here). ✅ marks the correct choice(s); each wrong choice is followed by its hint.",
);
lines.push("");

for (const module of MODULES) {
  lines.push(`## ${module.category}: ${module.title}`);
  lines.push("");
  for (const q of module.questions) {
    if (q.personalized) continue;
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

console.log(lines.join("\n"));
