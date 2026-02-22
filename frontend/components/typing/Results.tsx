"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

interface ResultsProps {
  wpm: number;
  accuracy: number;
  score: number;
  timeMs: number;
  personalBest?: number;
  newRank: number | null;
  previousRank?: number | null;
  isSubmitting?: boolean;
  submitError?: string | null;
  txHash?: string | null;
  onPlayAgain: () => void;
  onClose: () => void;
}

export function Results({
  wpm,
  accuracy,
  score,
  timeMs,
  personalBest = 0,
  newRank,
  previousRank,
  isSubmitting = false,
  submitError = null,
  txHash = null,
  onPlayAgain,
  onClose,
}: ResultsProps) {
  const isNewPersonalBest = score > personalBest;
  const rankChange =
    previousRank && newRank ? previousRank - newRank : 0;

  const getAccuracyColor = (acc: number) => {
    if (acc >= 95) return "text-correct";
    if (acc >= 80) return "text-warning";
    return "text-error";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="glass-card rounded-2xl p-8 max-w-md w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          {isNewPersonalBest ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full mb-4"
            >
              <Trophy className="w-5 h-5" />
              <span className="font-semibold">New Personal Best!</span>
            </motion.div>
          ) : (
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Race Complete!
            </h2>
          )}
        </div>

        {/* Score Breakdown */}
        <div className="space-y-4 mb-8">
          {/* Final Score */}
          <div className="text-center p-6 bg-muted/50 rounded-xl">
            <div className="text-5xl font-mono font-bold text-primary prize-glow mb-2">
              {score.toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">
              {wpm} WPM × {accuracy.toFixed(1)}% Accuracy
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-mono font-bold text-foreground">
                {wpm}
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                WPM
              </div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div
                className={`text-2xl font-mono font-bold ${getAccuracyColor(accuracy)}`}
              >
                {accuracy.toFixed(1)}%
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Accuracy
              </div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-mono font-bold text-foreground">
                {(timeMs / 1000).toFixed(1)}s
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Time
              </div>
            </div>
          </div>

          {/* Rank Change */}
          {newRank && (
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Leaderboard Position</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-foreground">
                  #{newRank}
                </span>
                {rankChange !== 0 && (
                  <span
                    className={`flex items-center text-sm ${rankChange > 0 ? "text-correct" : "text-error"}`}
                  >
                    {rankChange > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {Math.abs(rankChange)}
                  </span>
                )}
                {rankChange === 0 && (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          )}

          {/* Personal Best Comparison */}
          {personalBest > 0 && !isNewPersonalBest && (
            <div className="text-center text-sm text-muted-foreground">
              Your personal best:{" "}
              <span className="font-mono font-bold text-foreground">
                {personalBest.toFixed(0)}
              </span>
              <span className="ml-2 text-error">
                ({(score - personalBest).toFixed(0)})
              </span>
            </div>
          )}

          {/* Submission status */}
          {isSubmitting && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Submitting score...</span>
            </div>
          )}
          {!isSubmitting && txHash && (
            <div className="flex items-center justify-center gap-2 text-correct">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">Score submitted!</span>
              <a
                href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View tx <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {!isSubmitting && submitError && (
            <div className="flex items-center justify-center gap-2 text-error">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{submitError}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onPlayAgain}
            disabled={isSubmitting}
            className="flex-1 btn-game-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
