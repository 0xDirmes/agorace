"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import type { SubmitAttemptResponse } from "@/types";

interface UseSubmitAttemptResult {
  submit: (scoreEncoded: number) => Promise<SubmitAttemptResponse>;
  isSubmitting: boolean;
  error: string | null;
  txHash: string | null;
  reset: () => void;
}

export function useSubmitAttempt(): UseSubmitAttemptResult {
  const { address } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const submit = useCallback(
    async (scoreEncoded: number): Promise<SubmitAttemptResponse> => {
      if (!address) {
        const err = "Wallet not connected";
        setError(err);
        return { success: false, error: err };
      }

      setIsSubmitting(true);
      setError(null);
      setTxHash(null);

      try {
        const response = await fetch("/api/submit-attempt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            player: address,
            score: scoreEncoded,
          }),
        });

        const data: SubmitAttemptResponse = await response.json();

        if (!data.success) {
          setError(data.error || "Submission failed");
        } else if (data.txHash) {
          setTxHash(data.txHash);
        }

        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsSubmitting(false);
      }
    },
    [address]
  );

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
    setTxHash(null);
  }, []);

  return {
    submit,
    isSubmitting,
    error,
    txHash,
    reset,
  };
}
