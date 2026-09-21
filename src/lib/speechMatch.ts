const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "and", "or", "in", "is", "are", "for", "on", "by", "at", "with",
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/** The digit form of a number written parenthetically after its spelled-out form ("Four hundred
 * thirty-five (435)") — extracted separately because `normalize` strips parentheticals entirely
 * (they're usually optional qualifiers), which would otherwise throw away the ONE token speech
 * recognition is most likely to actually produce: Chrome commonly transcribes a spoken number as
 * literal digits ("435") rather than the words ("four hundred thirty five"). */
function parenthesizedNumeral(s: string): string | null {
  const m = s.match(/\((\d+)\)/);
  return m ? m[1] : null;
}

export type SpeechVerdict = "correct" | "close" | "incorrect";

export type SpeechEvaluation = {
  verdict: SpeechVerdict;
  score: number;
  matchedAnswer: string;
};

/**
 * Scores a spoken transcript against a question's accepted answers by keyword overlap — the
 * civics answers are short, content-word-dense phrases ("Legislative, executive, and judicial"),
 * so "what fraction of the answer's meaningful words did the speaker actually say" is a solid,
 * dependency-free proxy for correctness without needing exact-string matching (which would fail
 * on filler words, articles, or minor rewording that speech recognition itself introduces).
 *
 * Numeric answers get a dedicated fast path: saying the digits outright ("435") is just as valid
 * an answer as spelling the number out, so it's checked as a standalone full match rather than
 * being folded into the generic word-overlap fraction (which would otherwise require ALSO saying
 * "four hundred thirty five" for the digits to count for anything).
 */
export function evaluateSpeech(transcript: string, acceptedAnswers: string[]): SpeechEvaluation {
  const spoken = new Set(significantWords(transcript));
  const spokenDigits = new Set(transcript.match(/\d+/g) ?? []);

  let best: SpeechEvaluation = { verdict: "incorrect", score: 0, matchedAnswer: acceptedAnswers[0] };
  for (const answer of acceptedAnswers) {
    const numeral = parenthesizedNumeral(answer);
    if (numeral && spokenDigits.has(numeral)) {
      best = { verdict: "correct", score: 1, matchedAnswer: answer };
      break;
    }

    const answerWords = significantWords(answer);
    if (answerWords.length === 0) continue;
    const hits = answerWords.filter((w) => spoken.has(w)).length;
    const score = hits / answerWords.length;
    if (score > best.score) {
      best = { verdict: "incorrect", score, matchedAnswer: answer };
    }
  }

  if (best.verdict !== "correct") {
    if (best.score >= 0.7) best.verdict = "correct";
    else if (best.score >= 0.35) best.verdict = "close";
    else best.verdict = "incorrect";
  }

  return best;
}
