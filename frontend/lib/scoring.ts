import { SCORE_MULTIPLIER } from "./constants";

export interface TypingStats {
  wpm: number;
  accuracy: number;
  score: number;
  scoreEncoded: number;
  timeMs: number;
  correctChars: number;
  totalChars: number;
}

/**
 * Calculate WPM (Words Per Minute)
 * Standard calculation: (characters / 5) / (time in minutes)
 * Using character count / 5 as "word" approximation is industry standard
 */
export function calculateWPM(totalChars: number, timeMs: number): number {
  const timeMinutes = timeMs / 60_000;
  if (timeMinutes <= 0) return 0;
  return Math.round((totalChars / 5) / timeMinutes);
}

/**
 * Calculate accuracy as percentage
 */
export function calculateAccuracy(correctChars: number, totalChars: number): number {
  if (totalChars <= 0) return 100;
  return Math.round((correctChars / totalChars) * 100 * 100) / 100; // 2 decimal places
}

/**
 * Calculate score using formula: WPM * (accuracy / 100)
 * This rewards both speed and precision
 */
export function calculateScore(wpm: number, accuracy: number): number {
  return Math.round(wpm * (accuracy / 100) * 100) / 100;
}

/**
 * Encode score for on-chain storage (multiply by 100 to preserve 2 decimals)
 */
export function encodeScore(score: number): number {
  return Math.round(score * SCORE_MULTIPLIER);
}

/**
 * Decode score from on-chain storage (divide by 100)
 */
export function decodeScore(encodedScore: bigint | number): number {
  return Number(encodedScore) / SCORE_MULTIPLIER;
}

/**
 * Count correct characters by comparing input to passage
 */
export function countCorrectChars(input: string, passage: string): number {
  let correct = 0;
  for (let i = 0; i < input.length && i < passage.length; i++) {
    if (input[i] === passage[i]) correct++;
  }
  return correct;
}

/**
 * Calculate all typing statistics
 */
export function calculateTypingStats(
  input: string,
  passage: string,
  startTime: number,
  endTime: number
): TypingStats {
  const timeMs = endTime - startTime;
  const totalChars = input.length;
  const correctChars = countCorrectChars(input, passage);

  const wpm = calculateWPM(totalChars, timeMs);
  const accuracy = calculateAccuracy(correctChars, totalChars);
  const score = calculateScore(wpm, accuracy);
  const scoreEncoded = encodeScore(score);

  return {
    wpm,
    accuracy,
    score,
    scoreEncoded,
    timeMs,
    correctChars,
    totalChars,
  };
}
