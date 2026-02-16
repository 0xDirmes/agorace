"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { TypingGame } from "@/components/typing/TypingGame";
import { Results } from "@/components/typing/Results";
import { usePlayerState } from "@/hooks/usePlayerState";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useSubmitAttempt } from "@/hooks/useSubmitAttempt";
import { useApprove } from "@/hooks/useApprove";
import { useAllowance } from "@/hooks/useAllowance";
import { type TypingStats } from "@/lib/scoring";
import { TYPING_PASSAGE } from "@/lib/constants";

type PlayState = "checking" | "approving" | "playing" | "results";

export default function PlayPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { bestScore } = usePlayerState();
  const { currentUserRank, refetch: refetchLeaderboard } = useLeaderboard();
  const { submit, isSubmitting } = useSubmitAttempt();
  const { approve, isApproving, error: approveError, reset: resetApprove } = useApprove();
  const { hasSufficientAllowance, isLoading: isCheckingAllowance, refetch: refetchAllowance } = useAllowance();

  const [playState, setPlayState] = useState<PlayState>("checking");
  const [gameResults, setGameResults] = useState<TypingStats | null>(null);
  const [previousRank, setPreviousRank] = useState<number | null>(null);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  // Check allowance on mount — skip approval if already approved
  useEffect(() => {
    if (playState !== "checking" || isCheckingAllowance) return;

    if (hasSufficientAllowance) {
      setPlayState("playing");
    } else {
      setPlayState("approving");
    }
  }, [playState, isCheckingAllowance, hasSufficientAllowance]);

  // Auto-trigger approve tx when entering approving state
  useEffect(() => {
    if (isConnected && playState === "approving" && !isApproving && !approveError) {
      handleApprove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, playState]);

  const handleApprove = useCallback(async () => {
    try {
      await approve();
      setPlayState("playing");
    } catch {
      // Error is stored in useApprove state
    }
  }, [approve]);

  // Store previous rank when starting game
  useEffect(() => {
    if (playState === "playing") {
      setPreviousRank(currentUserRank);
    }
  }, [playState, currentUserRank]);

  const handleGameComplete = useCallback(
    async (stats: TypingStats) => {
      setGameResults(stats);
      setPlayState("results");

      const result = await submit(stats.scoreEncoded);

      if (result.success) {
        refetchLeaderboard();
        refetchAllowance();
      }
    },
    [submit, refetchLeaderboard, refetchAllowance]
  );

  const handleCancel = useCallback(() => {
    router.push("/");
  }, [router]);

  const handlePlayAgain = useCallback(() => {
    setGameResults(null);
    resetApprove();
    // Re-check allowance — after first approve, infinite approval should be set
    setPlayState("checking");
  }, [resetApprove]);

  const handleCloseResults = useCallback(() => {
    router.push("/");
  }, [router]);

  // Don't render if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {(playState === "checking" || playState === "approving") && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center"
          >
            <div className="text-center space-y-4">
              {(playState === "checking" || isApproving) && (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground">
                    {playState === "checking"
                      ? "Checking approval..."
                      : "Approving AUSD (one-time)..."}
                  </p>
                  {isApproving && (
                    <p className="text-sm text-muted-foreground/70">
                      Confirm the transaction in your wallet
                    </p>
                  )}
                </>
              )}
              {approveError && (
                <div className="space-y-4">
                  <p className="text-error">Approval failed</p>
                  <p className="text-sm text-muted-foreground">{approveError}</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleApprove}
                      className="btn-game-primary"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

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
            personalBest={bestScore}
            newRank={currentUserRank}
            previousRank={previousRank}
            isSubmitting={isSubmitting}
            onPlayAgain={handlePlayAgain}
            onClose={handleCloseResults}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
