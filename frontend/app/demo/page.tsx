"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";

import { TypingGame } from "@/components/typing/TypingGame";
import { Results } from "@/components/typing/Results";
import { type TypingStats } from "@/lib/scoring";
import { TYPING_PASSAGE } from "@/lib/constants";

type PlayState = "playing" | "results";

// Demo page - no wallet required, just shows the typing game UI
export default function DemoPage() {
  const [playState, setPlayState] = useState<PlayState>("playing");
  const [gameResults, setGameResults] = useState<TypingStats | null>(null);

  const handleGameComplete = useCallback((stats: TypingStats) => {
    setGameResults(stats);
    setPlayState("results");
    // No blockchain submission in demo mode
  }, []);

  const handleCancel = useCallback(() => {
    // Just reset to playing state
    setPlayState("playing");
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGameResults(null);
    setPlayState("playing");
  }, []);

  const handleCloseResults = useCallback(() => {
    setGameResults(null);
    setPlayState("playing");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {playState === "playing" && (
          <TypingGame
            key="game"
            passage={TYPING_PASSAGE}
            onComplete={handleGameComplete}
            onCancel={handleCancel}
          />
        )}

        {playState === "results" && gameResults && (
          <Results
            key="results"
            wpm={gameResults.wpm}
            accuracy={gameResults.accuracy}
            score={gameResults.score}
            timeMs={gameResults.timeMs}
            personalBest={undefined}
            newRank={null}
            previousRank={undefined}
            isSubmitting={false}
            onPlayAgain={handlePlayAgain}
            onClose={handleCloseResults}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
