"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";

import { TypingGame } from "@/components/typing/TypingGame";
import { Results } from "@/components/typing/Results";
import { usePlayerState } from "@/hooks/usePlayerState";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useSubmitAttempt } from "@/hooks/useSubmitAttempt";
import { useApprove } from "@/hooks/useApprove";
import { useAllowance } from "@/hooks/useAllowance";
import { useWalletSetup } from "@/hooks/useWalletSetup";
import { type TypingStats } from "@/lib/scoring";
import { TYPING_PASSAGE } from "@/lib/constants";

type PlayState = "checking" | "needs_funds" | "approving" | "playing" | "results";

export default function PlayPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { bestScore } = usePlayerState();
  const { currentUserRank, refetch: refetchLeaderboard } = useLeaderboard();
  const { submit, isSubmitting, error: submitError, txHash } = useSubmitAttempt();
  const { approve, isApproving, error: approveError, reset: resetApprove } = useApprove();
  const { hasSufficientAllowance, isLoading: isCheckingAllowance, refetch: refetchAllowance } = useAllowance();
  const { hasEnoughBalance, status: balanceStatus, refetchBalance } = useWalletSetup();

  const [playState, setPlayState] = useState<PlayState>("checking");
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);
  const [faucetError, setFaucetError] = useState<string | null>(null);
  const [faucetTxHash, setFaucetTxHash] = useState<string | null>(null);
  const [gameResults, setGameResults] = useState<TypingStats | null>(null);
  const [previousRank, setPreviousRank] = useState<number | null>(null);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  // Check balance + allowance on mount — gate gameplay on both
  useEffect(() => {
    if (playState !== "checking" || balanceStatus === "checking" || isCheckingAllowance) return;

    if (!hasEnoughBalance) {
      setPlayState("needs_funds");
    } else if (hasSufficientAllowance) {
      setPlayState("playing");
    } else {
      setPlayState("approving");
    }
  }, [playState, balanceStatus, isCheckingAllowance, hasEnoughBalance, hasSufficientAllowance]);

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

  const handleFaucetRequest = useCallback(async () => {
    if (!address) return;
    setIsFaucetLoading(true);
    setFaucetError(null);
    setFaucetTxHash(null);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Faucet request failed");
      setFaucetTxHash(data.txHash);
      setIsFaucetLoading(false);
      await refetchBalance();
      // Brief pause so user can see the success + tx link before advancing
      setTimeout(() => setPlayState("checking"), 2000);
    } catch (err) {
      setFaucetError(err instanceof Error ? err.message : "Faucet request failed");
      setIsFaucetLoading(false);
    }
  }, [address, refetchBalance]);

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
        refetchBalance();
      }
    },
    [submit, refetchLeaderboard, refetchAllowance, refetchBalance]
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
        {(playState === "checking" || playState === "needs_funds" || playState === "approving") && (
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
                      ? "Checking balance..."
                      : "Approving AUSD (one-time)..."}
                  </p>
                  {isApproving && (
                    <p className="text-sm text-muted-foreground/70">
                      Confirm the transaction in your wallet
                    </p>
                  )}
                </>
              )}
              {playState === "needs_funds" && (
                <div className="space-y-4">
                  <p className="text-foreground font-medium">
                    You need AUSD to play
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Each game costs 1 AUSD. Request testnet tokens to get started.
                  </p>
                  {faucetError && (
                    <p className="text-sm text-error">{faucetError}</p>
                  )}
                  {faucetTxHash && (
                    <div className="flex items-center justify-center gap-2 text-correct">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm">10 AUSD received!</span>
                      <a
                        href={`https://sepolia.arbiscan.io/tx/${faucetTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View tx <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {!faucetTxHash && (
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={handleFaucetRequest}
                        disabled={isFaucetLoading}
                        className="btn-game-primary"
                      >
                        {isFaucetLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                            Requesting...
                          </>
                        ) : (
                          "Request 10 testnet AUSD"
                        )}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
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
            submitError={submitError}
            txHash={txHash}
            onPlayAgain={handlePlayAgain}
            onClose={handleCloseResults}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
