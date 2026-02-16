"use client";

import { useState, useCallback } from "react";
import { useAccount, useConfig, useSendCalls } from "wagmi";
import { waitForCallsStatus } from "@wagmi/core";
import { encodeFunctionData, maxUint256 } from "viem";
import { AGORACE_ADDRESS, AUSD_ADDRESS, ausdAbi } from "@/lib/contracts";

interface UseApproveResult {
  approve: () => Promise<void>;
  isApproving: boolean;
  error: string | null;
  reset: () => void;
}

export function useApprove(): UseApproveResult {
  const { address } = useAccount();
  const config = useConfig();
  const { sendCallsAsync } = useSendCalls();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = useCallback(async () => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    setIsApproving(true);
    setError(null);

    try {
      // Send via wallet_sendCalls (EIP-5792) so Porto can sponsor gas
      const { id } = await sendCallsAsync({
        calls: [
          {
            to: AUSD_ADDRESS,
            data: encodeFunctionData({
              abi: ausdAbi,
              functionName: "approve",
              args: [AGORACE_ADDRESS, maxUint256],
            }),
          },
        ],
      });

      // Wait for the batch call to be mined
      await waitForCallsStatus(config, { id, timeout: 60_000 });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to approve AUSD";
      setError(message);
      throw err;
    } finally {
      setIsApproving(false);
    }
  }, [address, config, sendCallsAsync]);

  const reset = useCallback(() => {
    setError(null);
    setIsApproving(false);
  }, []);

  return {
    approve,
    isApproving,
    error,
    reset,
  };
}
